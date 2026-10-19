import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './neisSync';

describe('나이스 연동 잠금', () => {
  it('같은 비밀번호로만 풀린다', async () => {
    const data = { records: [{ name: '박지우', memo: '늦잠' }] };
    const env = await encrypt(data, '우리반비번123');
    expect(env.ct).not.toContain('박지우');
    expect(await decrypt(env, '우리반비번123')).toEqual(data);
    await expect(decrypt(env, '틀린비번')).rejects.toThrow();
  });
});
