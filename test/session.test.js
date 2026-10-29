import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'x'.repeat(40);
const { createToken, verifyToken, readSession, COOKIE_NAME } = await import('../lib/session.js');

test('발급한 토큰은 검증된다', () => {
  assert.deepEqual(verifyToken(createToken('admin')), { username: 'admin' });
});

test('변조된 토큰은 거부된다', () => {
  const [p, s] = createToken('admin').split('.');
  const forged = Buffer.from(JSON.stringify({ u: 'root', exp: 9e9 })).toString('base64url');
  assert.equal(verifyToken(`${forged}.${s}`), null);
  assert.equal(verifyToken(`${p}.${s}x`), null);
  assert.equal(verifyToken('garbage'), null);
});

test('만료된 토큰은 거부된다', () => {
  const t = createToken('admin', Date.now() - 9 * 3600 * 1000);
  assert.equal(verifyToken(t), null);
});

test('쿠키 헤더에서 세션을 읽는다', () => {
  const req = { headers: { cookie: `a=1; ${COOKIE_NAME}=${createToken('admin')}; b=2` } };
  assert.deepEqual(readSession(req), { username: 'admin' });
  assert.equal(readSession({ headers: {} }), null);
});
