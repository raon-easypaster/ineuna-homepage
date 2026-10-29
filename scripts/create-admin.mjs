// 관리자 계정 생성·비밀번호 재설정
// 사용법: MONGODB_URI=... node scripts/create-admin.mjs <아이디>
//   (.env 파일이 있으면: node --env-file=.env scripts/create-admin.mjs <아이디>)
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { getDb } from '../lib/db.js';

const username = String(process.argv[2] || '').trim().toLowerCase();
if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
  console.error('사용법: node scripts/create-admin.mjs <아이디>  (영문 소문자·숫자·._- 3~64자)');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('비밀번호(12자 이상): ');
rl.close();
if (password.length < 12) {
  console.error('비밀번호는 12자 이상이어야 합니다.');
  process.exit(1);
}

const db = await getDb();
const passwordHash = await bcrypt.hash(password, 12);
const result = await db.collection('admins').updateOne(
  { username },
  { $set: { passwordHash, updatedAt: new Date() }, $setOnInsert: { username, createdAt: new Date() } },
  { upsert: true },
);
console.log(result.upsertedCount ? `관리자 '${username}' 생성 완료` : `관리자 '${username}' 비밀번호 변경 완료`);
process.exit(0);
