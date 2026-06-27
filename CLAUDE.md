# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# 프로젝트: 강화대전 (Enhance_War)

아래는 작업 시 알고 있어야 할 프로젝트 정보. 체크리스트나 목표가 아니라 컨텍스트이므로, 작업 전에 관련 섹션을 다시 읽고 시작할 것.

## 기술 스택
- 실시간 매치 로직: Node.js + Express + Socket.io, Render 무료 티어 배포
- 클라이언트: Vanilla JS, DOM 기반 UI (Canvas 불필요)
- 로그인/영구 데이터: Firebase Auth(구글 로그인만) + Firestore
- 두 백엔드 관심사는 분리되어 있음 — Firebase는 인증/영구 화폐/기록 전용, 실시간 대결 자체는 Socket.io가 담당. 클라이언트가 Firebase 토큰을 Socket.io 연결 시 같이 보내서 서버가 유저를 식별함
- 이미지: 전부 Piskel(무료 픽셀아트 툴)로 직접 제작. 코드에서 이미지를 생성하거나 placeholder 이상의 것을 임의로 만들지 말 것 — 에셋은 사용자가 채워 넣음

## 핵심 용어 (코드 변수명도 이걸 따를 것)
- **코인**: 매치마다 리셋되는 대전 화폐. 강화 시도, 인게임 카드 상점 구매에 사용
- **돈(원)**: 계정에 영구 누적되는 화폐. Firestore에 저장. 매치 승리 시에만 지급(1000원), 패배 시 0원
- **콤보**: 연속 강화 성공 횟수. 성공률에는 영향 없음 — 오직 "판매가치"에만 곱연산으로 반영
- **판매(cash out)**: 현재 검을 즉시 코인으로 환전. 검은 단계 0으로 리셋, 콤보도 리셋. 전투력에는 더 이상 기여 못 함 (push-your-luck 트레이드오프가 이 게임의 핵심 긴장 요소)

## 게임 루프 개요
1. 로그인(구글) → 메인 메뉴 → 대결 시작 → 매칭(5~8초, 매칭 안 되면 내부적으로 봇 대체, 클라이언트에는 절대 봇임을 노출하지 않음)
2. 라운드 진행: 라운드당 40초 강화 타임 → 라운드 종료 시 양측 검의 ATK/DUR로 교전 자동 계산 → HP 피해 적용 → 카드 상점 페이즈(★20초) → 다음 라운드
3. 라운드 수에 제한 없음. 한쪽 HP가 0이 되는 즉시 매치 종료. 같은 ATK라도 라운드가 지날수록 피해량이 커지는 escalation 공식이 있음(아래 공식 참고) — 이게 무한정 늘어지는 걸 막는 장치이므로 임의로 라운드 캡을 다시 넣지 말 것
4. 검 파괴(강화 실패) 시: 강화단계는 유지, 내구도만 다음 라운드에 100% 회복 (단계가 0으로 리셋되는 건 "판매"를 했을 때뿐이고, 실패는 다른 처리임 — 혼동하기 쉬운 부분이니 주의)

## 핵심 공식 (전부 상수로 분리해서 구현 — 밸런스 튜닝이 끝나지 않은 값들임)
```
강화 비용(n) = 10 * 1.25^n          // n = 현재 단계
강화 성공률(n) = 5% + 90% * 0.82^n
판매가치(level, combo) = (level * 50) * (1 + combo * 0.15)
ATK(level) = level * 10
DUR(level) = 50 + level * 15
HP 피해 = 승자ATK * 0.3 * damageMultiplier(round)
damageMultiplier(round) = 1 + (round - 1) * 0.15
```
이 수치들은 시뮬레이션 전 단계의 추정값. 정확한 값을 박아넣지 말고 설정 파일/상수 객체로 분리해서, 나중에 시뮬레이션 스크립트로 수백 판 자동 대전 돌려본 뒤 값만 바꿔서 재조정할 수 있게 만들 것.

## 카드 시스템
- 카드 획득은 오직 라운드 종료 후 상점에서 구매. 강화 성공시 확률 드랍 같은 건 없음
- 손패 최대 8장. 상점 진열대 → 손패로 드래그 = 구매, 손패 → 진열대로 드래그 = 판매
- 카드 유형: 액티브(클릭해서 즉시 발동, 1회 소모) / 패시브(들고만 있어도 자동 적용). 패시브가 더 많음(19:6)
- 희귀도 1성~7성. 7성은 상점 레벨 6(최대)에서도 4% 확률로만 등장하도록 가중치를 둘 것 — 의도적으로 매우 드물고 강력함("이번 라운드 무적", "공격력 x1000" 등 역전용)
- 카드 풀 25종, 레벨업(같은 카드 중복 구매 시 흡수+XP) 가능한 카드는 그중 3종뿐 — 나머지는 중복 사면 그냥 팔면 됨

## 화면 흐름
로그인 → 메인 메뉴(닉네임/보유 돈/대결 시작/랭킹보드/카드 컬렉션/설정) → 매칭 대기 → 대결 화면(좌우 거울 구도, 손패 8슬롯 상시 노출) → [라운드 종료마다] 상점 화면 → 결과 화면(최종 검 모습, 강화단계, 개인 최고 기록, 획득한 돈)

## 디자인 톤
- 도트(픽셀아트) 스타일, 대장간/단철소 분위기
- 폰트: Galmuri9 (OFL 라이선스, 한글 풀 커버)
- 카드 테두리 색으로 성급 구분(1성 회색 → 7성 무지개), 7성 테두리 애니메이션은 Piskel 스프라이트로 제작

## 주의사항
- 랭킹보드/카드 컬렉션 화면, 튜토리얼, 사운드, 모바일 대응은 전부 다음 단계 작업으로 보류된 항목임 — 먼저 묻지 않고 임의로 구현하지 말 것
- 봇 매치는 서버 내부적으로만 `isBot` 플래그로 구분하고 클라이언트에는 절대 전송하지 않음. 랭킹 집계 시 봇 매치는 제외