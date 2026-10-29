import { clearCookie } from '../lib/session.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
  }
  res.setHeader('Set-Cookie', clearCookie());
  return res.status(200).json({ ok: true });
}
