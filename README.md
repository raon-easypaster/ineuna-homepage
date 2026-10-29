# INEUNA 홈페이지 개편 자료

- `site/index.html` — 홈페이지 개편 시안 (정적 HTML, 브라우저로 바로 열람)
- `사업별_사진/` — 사업별 사진 분류와 출처·사용범위 (`README_출처_사용범위.txt`)
- `INEUNA_홈페이지_2차보완자료_이광복목사님용/`, `homepage_bundle/` — 제작 지침 및 원본 자료
- `aquila_homepage_photos/`, `사진자료/` — 아퀼라 사진 원본

> 시안 단계입니다. 사진 사용 허락, 진행단계 표기, 연락처 등은 담당자 확인 후 확정됩니다.

## 관리자 로그인 (Vercel + MongoDB Atlas)

- 로그인 화면: `/admin` → `site/admin/index.html`
- API: `api/login.js`, `api/logout.js`, `api/me.js` (Vercel 서버리스 함수)
- 공용 코드: `lib/db.js`(DB 연결), `lib/session.js`(서명 쿠키 세션, `requireAdmin`)

### 설정 순서
1. **Atlas**: 찬양콘티와 같은 클러스터에서 `Database Access`로 새 사용자를 만들고, 권한은 `ineuna_auth` DB에만 `readWrite`를 줍니다.
2. **Vercel**: 이 저장소를 새 프로젝트로 가져오고(Framework: Other, Build 명령 없음) 환경변수 `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`을 등록합니다. 예시는 `.env.example`에 있습니다.
3. **Atlas Network Access**: Vercel은 고정 IP가 없으므로 `0.0.0.0/0`을 허용해야 합니다. 찬양콘티에서 이미 허용했다면 그대로 쓰면 됩니다.
4. **관리자 계정 생성** (로컬에서 한 번):
   ```bash
   npm install
   cp .env.example .env   # 값 채우기
   node --env-file=.env scripts/create-admin.mjs <아이디>
   ```
   같은 명령을 다시 실행하면 비밀번호가 재설정됩니다.

### 보안 메모
- 비밀번호는 bcrypt(cost 12)로 해시해서 저장하고, 세션은 HttpOnly·Secure·SameSite=Strict 쿠키로 8시간 유지됩니다.
- 15분 동안 아이디별 5회, IP별 20회 넘게 실패하면 로그인을 차단합니다.
- 관리 기능 API를 추가할 때는 `requireAdmin(req, res)`로 먼저 막아주세요.
