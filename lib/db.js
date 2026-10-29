import { MongoClient } from 'mongodb';

// 서버리스 함수가 재사용될 때 연결을 다시 맺지 않도록 전역에 캐시한다.
const g = globalThis;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI가 설정되지 않았습니다.');
  if (!g._ineunaMongo) {
    g._ineunaMongo = new MongoClient(uri, { maxPoolSize: 5 }).connect().then(async (client) => {
      const db = client.db(process.env.MONGODB_DB || 'ineuna_auth');
      await Promise.all([
        db.collection('admins').createIndex({ username: 1 }, { unique: true }),
        // 로그인 실패 기록은 15분 뒤 자동 삭제
        db.collection('login_attempts').createIndex({ createdAt: 1 }, { expireAfterSeconds: 15 * 60 }),
        db.collection('login_attempts').createIndex({ key: 1 }),
      ]);
      return db;
    }).catch((err) => {
      g._ineunaMongo = null;
      throw err;
    });
  }
  return g._ineunaMongo;
}
