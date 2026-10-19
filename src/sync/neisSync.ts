/**
 * 휴대폰 → 학교 PC 나이스 자동 연동 (깃허브 비공개 저장소 경유)
 *
 * 「나이스 반영」 을 누르면 나이스 입력 파일을 선생님 비밀번호로 잠가 inbox/ 에 올린다.
 * 학교 PC 의 키트(app_sync.py)가 몇 분마다 inbox 를 확인해 나이스에 넣고, results/ 에 결과(건수만)를 올린다.
 * 연동 설정(토큰·비밀번호)은 이 기기에만 저장하고 백업 파일에는 넣지 않는다.
 */
import type { NeisFile } from '../domain/neis';

export interface SyncConfig {
  /** 예: YeoBBun/school-attendance-sync */
  repo: string;
  token: string;
  passphrase: string;
}

export interface SyncJob {
  name: string;
  sentAt: string;
  count: number;
  status: 'pending' | 'done' | 'check' | 'error';
  message?: string;
  finishedAt?: string;
}

interface SyncResult {
  format: 'attendance-app/neis-result-v1';
  status: 'done' | 'check' | 'error';
  message: string;
  count: number;
  manual: number;
  finishedAt: string;
}

export const ENC_FORMAT = 'attendance-app/neis-enc-v1';
const PBKDF2_ITER = 210_000;
const CONFIG_KEY = 'neis-sync-config';
const JOBS_KEY = 'neis-sync-jobs';
let API = (() => {
  try {
    return localStorage.getItem('neis-sync-api') ?? 'https://api.github.com'; // 시험용으로만 바꾼다
  } catch {
    return 'https://api.github.com';
  }
})();

/** 시험용 */
export function setApiBase(url: string) {
  API = url;
}

// ─── 이 기기에만 저장 ─────────────────────────────────────

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(cfg: SyncConfig | null) {
  try {
    if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* 저장 공간을 못 쓰는 환경 */
  }
}

export function loadJobs(): SyncJob[] {
  try {
    return JSON.parse(localStorage.getItem(JOBS_KEY) ?? '[]') as SyncJob[];
  } catch {
    return [];
  }
}

function saveJobs(jobs: SyncJob[]) {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.slice(0, 10)));
  } catch {
    /* 무시 */
  }
}

// ─── 잠그기 (PBKDF2-SHA256 → AES-256-GCM) ──────────────────

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64.replace(/\s/g, ''));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface Envelope {
  format: typeof ENC_FORMAT;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}

export async function encrypt(obj: unknown, passphrase: string): Promise<Envelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITER);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
  return { format: ENC_FORMAT, kdf: 'PBKDF2-SHA256', iter: PBKDF2_ITER, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
}

export async function decrypt(env: Envelope, passphrase: string): Promise<unknown> {
  const key = await deriveKey(passphrase, fromB64(env.salt), env.iter);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv) }, key, fromB64(env.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// ─── 깃허브 ──────────────────────────────────────────────

async function gh(cfg: SyncConfig, method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${API}/repos/${cfg.repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

/** 연결 확인. 문제가 없으면 null, 있으면 선생님께 보여줄 문장. */
export async function testConnection(cfg: SyncConfig): Promise<string | null> {
  try {
    const r = await gh(cfg, 'GET', '');
    if (r.status === 200) {
      const repo = (await r.json()) as { private?: boolean; permissions?: { push?: boolean } };
      if (!repo.private) return '저장소가 공개(Public)로 되어 있어요. 깃허브에서 Private 으로 바꿔 주세요.';
      if (repo.permissions && !repo.permissions.push) return '토큰에 쓰기 권한이 없어요. Contents 를 Read and write 로 만들어 주세요.';
      return null;
    }
    if (r.status === 401) return '토큰이 맞지 않거나 만료됐어요.';
    if (r.status === 404) return '저장소를 찾지 못했어요. 이름과 토큰의 저장소 선택을 확인해 주세요.';
    return `깃허브 응답 오류 (${r.status})`;
  } catch {
    return '인터넷 연결을 확인해 주세요.';
  }
}

function jobName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `neis-${stamp}-${Math.random().toString(36).slice(2, 6)}.json`;
}

/** 잠가서 inbox 에 올린다. 돌려주는 이름으로 결과를 확인한다. */
export async function sendToNeis(cfg: SyncConfig, file: NeisFile): Promise<SyncJob> {
  const envelope = await encrypt(file, cfg.passphrase);
  const name = jobName();
  const r = await gh(cfg, 'PUT', `/contents/inbox/${name}`, {
    message: '출결 보냄', // 커밋 메시지에도 학생 정보를 넣지 않는다
    content: btoa(JSON.stringify(envelope)),
  });
  if (!r.ok) throw new Error(r.status === 401 ? '토큰이 맞지 않거나 만료됐어요.' : `보내지 못했어요 (깃허브 ${r.status})`);
  const job: SyncJob = { name, sentAt: new Date().toISOString(), count: file.records.length, status: 'pending' };
  saveJobs([job, ...loadJobs()]);
  return job;
}

/** 학교 PC 가 올린 결과를 확인한다. 아직이면 그대로 돌려준다. 결과를 읽으면 저장소에서 지운다. */
export async function refreshJob(cfg: SyncConfig, job: SyncJob): Promise<SyncJob> {
  if (job.status !== 'pending') return job;
  const r = await gh(cfg, 'GET', `/contents/results/${job.name}`);
  if (r.status !== 200) return job;
  const data = (await r.json()) as { content: string; sha: string };
  const result = JSON.parse(new TextDecoder().decode(fromB64(data.content))) as SyncResult;
  const updated: SyncJob = { ...job, status: result.status, message: result.message, finishedAt: result.finishedAt };
  saveJobs(loadJobs().map((j) => (j.name === job.name ? updated : j)));
  await gh(cfg, 'DELETE', `/contents/results/${job.name}`, { message: '결과 확인', sha: data.sha }).catch(() => undefined);
  return updated;
}
