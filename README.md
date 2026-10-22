# 워크숍 자기점검 (aeoncounsel.com/workshop/)

의료진 워크숍용 온라인 자기점검 3종과 강사용 CBI 실시간 집계 화면.
메인 홈페이지(aeoncounsel.com) 저장소와 분리된 별도 저장소이며, 메인 페이지는 수정하지 않습니다.

| 화면 | 주소 |
|---|---|
| 현재 소진 상태 체크 (CBI 19문항) | `/workshop/cbi/?session=회차ID` |
| 욕구·가치 우선순위 프로파일 (40문항) | `/workshop/needs/?session=회차ID` |
| 24가지 성격강점 프로파일 (96문항) | `/workshop/strengths/?session=회차ID` |
| 강사용 관리·대시보드 | `/workshop/admin/` |

## 파일
- `assets/common.css` — 메인 홈페이지 디자인 토큰(크림·우드, Noto Serif/Sans KR)
- `assets/quiz.js` — 회차 확인, 한 문항씩 응답 화면, 순위 계산
- `assets/cbi-data.js`, `needs-data.js`, `strengths-data.js` — 문항·채점
- `assets/backend.js` — Firebase 연결 (참가자 익명 로그인, 강사 이메일 로그인)
- `assets/firebase-config.js` — Firebase 웹 앱 설정값
- `assets/vendor/` — Firebase JS SDK 13.1.0, qrcode-generator 2.0.4 (자체 호스팅)
- `firestore.rules` — Firestore 보안규칙 (Firebase 콘솔 > Firestore > 규칙에 붙여넣기)

## 서버에 저장되는 것
`sessions/{회차ID}`: cbiOpen, needsOpen, strengthsOpen, ended, createdAt
`sessions/{회차ID}/cbiResults/{익명UID}`: personalBurnout, workBurnout, patientBurnout, submittedAt
그 외(19문항 개별 응답, 욕구·강점 응답과 결과, 자기질문 입력)는 서버로 보내지 않습니다.

## Firebase 설정 순서
1. Firestore 생성, Authentication에서 익명·이메일/비밀번호 사용
2. Authentication > 설정 > 승인된 도메인에 `aeoncounsel.com` 추가
3. 강사 계정 생성 → `firestore.rules`의 `ADMIN_EMAIL`을 그 이메일(소문자)로 바꿔 게시
4. 웹 앱 설정값을 `assets/firebase-config.js`에 입력
