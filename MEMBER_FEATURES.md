# 회원 기능과 개인 공간

2026-09-09 부트캠프 기능 확장. 기존 콘텐츠와 인터랙션을 유지합니다.

## 공통 기능

- Supabase 이메일/비밀번호 회원가입, 로그인, 로그아웃, 비밀번호 재설정
- 인증 메일 전송과 실제 로그인 완료를 구분하는 상태 표시
- 비회원 기기 저장 및 회원 전용 계정 저장
- 내 기록 JSON 다운로드와 방문자 기록 병합
- 계정별 RLS 소유권 보호, 다른 계정 전환 시 개인 입력 초기화
- revision 조건부 갱신으로 여러 탭의 충돌을 감지하고 덮어쓰기 방지
- 반응형 개인 공간, 키보드 접근 가능한 dialog, 모션 감소 설정 지원

## 실제 서비스 설정

프로젝트: vwvkonfvwdkdvnjedbnx. 공개 publishable key만 브라우저에 사용합니다.
인증 설정에서 이메일 인증이 켜진 것을 확인했습니다. SMTP 설정 여부와 인증 redirect allowlist는 현재 연결 도구로 확인/변경할 수 없습니다. 일반 방문자에게 공개하기 전에 Supabase Dashboard에서 다음을 확인해야 합니다.

1. Authentication > Email > SMTP Settings에 일반 방문자에게 메일을 보낼 수 있는 발신 서버를 설정합니다. 기본 SMTP는 프로젝트 팀 주소 대상으로 제한됩니다.
2. Authentication > URL Configuration에서 Site URL을 운영 주소로 설정하고, 네 GitHub Pages 주소 및 네 Vercel 운영 주소를 Redirect URLs에 추가합니다.
3. 회원가입 → 인증 메일 → 로그인 → 기록 저장 → 새 기기 로그인 순서로 실제 이메일을 사용해 최종 확인합니다.

Google/GitHub/Kakao 소셜 로그인은 공급자가 설정되지 않아 표시하지 않습니다.

## 배포

vercel.json을 포함합니다. 정적 사이트는 빌드 없이 배포하고 블로그는 npm run build로 dist를 배포합니다.
member/config.js (블로그 public/member/config.js)의 공개 URL/key를 변경하면 다른 Supabase 프로젝트에도 연결할 수 있습니다. 새 프로젝트에는 supabase/schema.sql을 적용하세요. 기존 프로젝트에는 이미 migration이 적용돼 있으므로 전체 SQL을 다시 실행하지 마세요.

## 검증

- JavaScript 문법 검사, 블로그 41개 글과 3개 앱 빌드
- Supabase 실제 미인증 REST 접근 차단 확인
- 임시 두 계정의 트랜잭션 검증으로 본인 SELECT/UPDATE 허용, 타인 SELECT/UPDATE 차단 확인 후 ROLLBACK; 테스트 데이터 잔존 없음
- 보안 advisors 0건, 계정별 정책 및 revision 제약 확인
- 코드 리뷰에서 로그아웃 입력 초기화와 동시 저장 충돌을 수정
- 실제 인증 메일 수신 및 브라우저 전체 흐름 검증은 아직 완료하지 않았습니다.

## 이 사이트의 추가 기능

강원 18개 지역 검색·렌즈 필터, 개인 컬렉션, 디자인 번역 실험값 저장·복원.
