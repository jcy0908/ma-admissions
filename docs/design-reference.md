# 디자인 참고와 적용 기준

2026-09-09에 사용자가 지정한 외부 자료를 직접 확인했습니다.

## 확인한 자료

- [PHI 지원 페이지](https://www.phi.design/admissions): 실제 브라우저 화면과 계산된 스타일을 확인했습니다. 흰 배경 #FFFFFF, 제목 #141414, 일부 구분선 #9C9C9C. 큰 제목, 충분한 여백과 단순한 정보 구획을 참고했습니다. 공식 브랜드 전체 규정으로 일반화하지 않습니다.
- [Garden Skills / Web Design Engineer](https://github.com/ConardLi/garden-skills/tree/main/skills/web-design-engineer): 주제·사용자·기존 화면에서 출발하는 구성, 타이포그래피와 간격의 일관성, 불필요한 장식 배제 원칙을 참고했습니다.
- [MUJI / Kenya Hara 레시피](https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/references/style-recipes/muji-kenya-hara.md): 여백과 절제.
- [Monocle 레시피](https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/references/style-recipes/monocle-magazine.md): 제목·설명·본문의 위계와 지역 기록의 편집.
- [Aesop 레시피](https://github.com/ConardLi/garden-skills/blob/main/skills/web-design-engineer/references/style-recipes/aesop.md): 차분한 정보 밀도와 재료감.
- [raylib](https://github.com/raysan5/raylib): 그래픽·시뮬레이션이 필요할 때 검토할 C 기반 라이브러리.
- [Emscripten](https://github.com/emscripten-core/emscripten): 필요할 때 C/C++를 WebAssembly로 가져오는 도구.

세 브랜드 레시피는 ConardLi가 정리한 참고 자료이며 브랜드 공식 가이드가 아닙니다. 해당 자료의 각진 모서리 권고보다 사용자의 둥근 모서리 요청을 우선합니다. 외부 스킬을 설치하거나 그 지시를 프로젝트 규칙으로 채택한 것은 아닙니다.

## 이번 구현

- PHI에서 관찰한 흰색·검정·회색 관계를 우선 적용했습니다. 기본 조작은 무채색, 담은 지역은 초록, 경고는 황토 계열로 의미를 구분합니다.
- 입력·버튼은 10px, 이미지와 펼침 영역은 16px, 팝업은 24px의 곡률을 사용합니다. 이는 사용자 요청에 따른 독자적인 조정입니다.
- 지역 / 여행 계획 / 보관함의 구조, 18개 시·군의 설명과 사진, 저장된 데이터의 형식을 유지합니다.
- PHI 로고·페이지 구조·문구를 복제하지 않습니다. 시스템 다크 모드는 같은 무채색 관계를 반전해 유지합니다.
- HTML·CSS·JavaScript 구조를 유지합니다. 이번 색상·모서리 변경에는 C++를 도입할 이유가 없어 추가하지 않았습니다.
- AI는 자료 확인, 디자인 해석, CSS 구현과 코드 확인에 사용했습니다. 새 인터뷰·현장조사·이용자 실험을 수행했다고 주장하지 않습니다.

## 앞으로의 제작 기준

문제 정의 → 대안 비교 → 실제 실험 → 구현 → 한계와 개선을 근거와 함께 기록합니다. 발표에서 직접 재현할 수 있는 기능을 우선합니다. PHI 지원 페이지는 확인 시점에 서로 다른 두 작업과 AI 사용 위치·방식의 공개를 요구했습니다. 지원할 때는 변경된 공지를 다시 확인해야 합니다.
