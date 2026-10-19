import { useState } from 'react';
import { loadSyncConfig, saveSyncConfig, testConnection, type SyncConfig } from '../sync/neisSync';

const DEFAULT_REPO = 'YeoBBun/school-attendance-sync';

/**
 * 나이스 자동 연동 설정 (휴대폰 → 학교 PC).
 * 토큰·잠금 비밀번호는 이 기기에만 저장하고 백업 파일에 넣지 않는다.
 */
export function SyncSettings() {
  const saved = loadSyncConfig();
  const [repo, setRepo] = useState(saved?.repo ?? DEFAULT_REPO);
  const [token, setToken] = useState(saved?.token ?? '');
  const [pass, setPass] = useState(saved?.passphrase ?? '');
  const [pass2, setPass2] = useState(saved?.passphrase ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!repo.includes('/') || !token.trim()) return setMsg({ ok: false, text: '저장소와 토큰을 넣어 주세요.' });
    if (pass.length < 8) return setMsg({ ok: false, text: '잠금 비밀번호는 8자 이상으로 정해 주세요.' });
    if (pass !== pass2) return setMsg({ ok: false, text: '잠금 비밀번호 두 칸이 서로 달라요.' });
    const cfg: SyncConfig = { repo: repo.trim(), token: token.trim(), passphrase: pass };
    setBusy(true);
    const problem = await testConnection(cfg);
    setBusy(false);
    if (problem) return setMsg({ ok: false, text: problem });
    saveSyncConfig(cfg);
    setMsg({ ok: true, text: '연결됐어요. 학교 PC 키트에도 같은 저장소·토큰·잠금 비밀번호를 넣어 주세요.' });
  };

  const off = () => {
    if (!confirm('이 기기의 나이스 연동 설정을 지울까요?')) return;
    saveSyncConfig(null);
    setToken('');
    setPass('');
    setPass2('');
    setMsg({ ok: true, text: '연동을 껐어요.' });
  };

  return (
    <section className="card">
      <h3>나이스 자동 연동 (휴대폰 → 학교 PC)</h3>
      <p className="hint">
        「나이스 반영」을 누르면 출결을 잠금 비밀번호로 잠가 비공개 깃허브 저장소에 올리고, 학교 PC가 몇 분 안에 나이스에 넣어요. 토큰과
        비밀번호는 <b>이 기기에만</b> 저장되고 백업 파일에는 들어가지 않아요.
      </p>
      <div className="sync-form">
        <label>
          <span className="field-label">깃허브 저장소</span>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder={DEFAULT_REPO} />
        </label>
        <label>
          <span className="field-label">토큰</span>
          <input type="password" value={token} autoComplete="off" onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
        </label>
        <label>
          <span className="field-label">잠금 비밀번호 (8자 이상)</span>
          <input type="password" value={pass} autoComplete="new-password" onChange={(e) => setPass(e.target.value)} />
        </label>
        <label>
          <span className="field-label">잠금 비밀번호 확인</span>
          <input type="password" value={pass2} autoComplete="new-password" onChange={(e) => setPass2(e.target.value)} />
        </label>
      </div>
      <div className="inline">
        <button className="primary" disabled={busy} onClick={save}>
          {busy ? '확인 중…' : '저장하고 연결 확인'}
        </button>
        {saved && (
          <button className="ghost" onClick={off}>
            연동 끄기
          </button>
        )}
      </div>
      {msg && <p className={msg.ok ? 'info' : 'error'}>{msg.text}</p>}
    </section>
  );
}
