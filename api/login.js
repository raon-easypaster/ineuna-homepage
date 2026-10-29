import bcrypt from 'bcryptjs';
import { getDb } from '../lib/db.js';
import { createToken, sessionCookie } from '../lib/session.js';

const MAX_FAILS_USER = 5; // 15분 동안 아이디별 허용 실패 횟수
const MAX_FAILS_IP = 20; // 15분 동안 IP별 허용 실패 횟수
// 존재하지 않는 아이디여도 같은 시간이 걸리도록 비교용 더미 해시를 쓴다.
const DUMMY_HASH = '$2a$12$Z8VIdNDeuasWL7lv1PSOYO6rlmpV3sGIycQrErERFbf0475YXvRpq';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
  }
  if (!String(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'JSON 요청만 받습니다.' });
  }

  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!username || !password || username.length > 64 || password.length > 200) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
  }

  try {
    const db = await getDb();
    const attempts = db.collection('login_attempts');
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const keys = [`u:${username}`, `ip:${ip}`];

    const [userFails, ipFails] = await Promise.all(keys.map((key) => attempts.countDocuments({ key })));
    if (userFails >= MAX_FAILS_USER || ipFails >= MAX_FAILS_IP) {
      return res.status(429).json({ error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.' });
    }

    const admin = await db.collection('admins').findOne({ username });
    const ok = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
    if (!admin || !ok) {
      const now = new Date();
      await attempts.insertMany(keys.map((key) => ({ key, createdAt: now })));
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    await Promise.all([
      attempts.deleteMany({ key: keys[0] }),
      db.collection('admins').updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } }),
    ]);
    res.setHeader('Set-Cookie', sessionCookie(createToken(admin.username)));
    return res.status(200).json({ username: admin.username });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
