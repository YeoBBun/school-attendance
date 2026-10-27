import { afterEach, describe, expect, it, vi } from 'vitest';
import { decrypt, pushPending, setApiBase } from './cloud';

const cfg = { repo: 'me/sync', token: 't', passphrase: '비번' };

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('위젯 요약 올리기', () => {
  it('지금 파일의 sha 로 덮어쓰고, 같은 내용은 다시 올리지 않는다', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    setApiBase('https://gh.test');
    const puts: { sha?: string; content: string }[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://gh.test/repos/me/sync/contents/sync/pending.json');
      if (init.method === 'GET') return new Response(JSON.stringify({ sha: 'old' }), { status: 200 });
      puts.push(JSON.parse(init.body as string));
      return new Response('{}', { status: 201 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const summary = { format: 'attendance-app/pending-v1', className: '', items: [{ who: '1. 가', doc: '결석계', what: '' }] };
    await pushPending(cfg, summary);
    await pushPending(cfg, summary);
    expect(puts).toHaveLength(1);
    expect(puts[0].sha).toBe('old');
    expect(await decrypt(JSON.parse(atob(puts[0].content)), '비번')).toEqual(summary);

    await pushPending(cfg, { ...summary, items: [] });
    expect(puts).toHaveLength(2);
  });

  it('처음이면(파일 없음) sha 없이 만든다', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    setApiBase('https://gh.test');
    const puts: { sha?: string }[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      if (init.method === 'GET') return new Response('', { status: 404 });
      puts.push(JSON.parse(init.body as string));
      return new Response('{}', { status: 201 });
    });
    await pushPending(cfg, { items: [] });
    expect(puts[0].sha).toBeUndefined();
  });
});
