import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'ineuna_admin';
const MAX_AGE = 8 * 60 * 60; // 8시간

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET은 32자 이상이어야 합니다.');
  return s;
}

const sign = (data) => createHmac('sha256', secret()).update(data).digest('base64url');

export function createToken(username, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Math.floor(now / 1000) + MAX_AGE })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof u !== 'string' || typeof exp !== 'number' || exp * 1000 < now) return null;
    return { username: u };
  } catch {
    return null;
  }
}

function cookieAttrs(maxAge) {
  const secure = process.env.NODE_ENV === 'development' ? '' : '; Secure';
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export const sessionCookie = (token) => `${COOKIE_NAME}=${token}; ${cookieAttrs(MAX_AGE)}`;
export const clearCookie = () => `${COOKIE_NAME}=; ${cookieAttrs(0)}`;

export function readSession(req) {
  const header = req.headers.cookie || '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match ? verifyToken(match.slice(COOKIE_NAME.length + 1)) : null;
}

// 다른 관리자 API에서 사용: 로그인하지 않았으면 401을 보내고 null 반환
export function requireAdmin(req, res) {
  const session = readSession(req);
  if (!session) res.status(401).json({ error: '로그인이 필요합니다.' });
  return session;
}
