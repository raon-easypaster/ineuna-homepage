import { requireAdmin } from '../lib/session.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const session = requireAdmin(req, res);
  if (!session) return;
  return res.status(200).json({ username: session.username });
}
