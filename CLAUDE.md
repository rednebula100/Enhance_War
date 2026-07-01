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

**전체 게임 스펙은 `enhance-war-MASTER-SPEC.md`가 유일한 기준 문서임.** 작업 시작 전 관련 섹션을 반드시 그 문서에서 다시 읽을 것. 이 CLAUDE.md에는 가장 자주 실수로 이어지는 핵심 사항만 발췌해둠 — 발췌본과 마스터 스펙이 충돌하면 마스터 스펙이 항상 우선.

## 기술 스택 (요약, 상세는 마스터 스펙 §1)
- Node.js + Express + Socket.io (Render), Vanilla JS 클라이언트
- Firebase Auth(구글 로그인만) + Firestore — Firebase는 인증/영구 화폐 전용, 실시간 대결은 Socket.io
- 이미지는 전부 Piskel로 직접 제작. 코드에서 placeholder 이상의 이미지를 임의로 만들지 말 것

## ★가장 자주 실수 나는 부분 — 검이 망가지는 두 가지 별개 이벤트
마스터 스펙 §3 표 그대로:
1. **강화 시도 실패** (라운드 중 강화 버튼 누를 때마다 롤) → 그 즉시 단계 0, 콤보 0 리셋
2. **라운드 종료 후 교전 패배** (내구도 소진) → 단계는 유지, 내구도만 회복, HP만 깎임

이 둘을 한 문장으로 합쳐서 요약하지 말 것 — 과거에 그렇게 적었다가 강화 실패해도 단계가 안 떨어지는 버그가 난 적 있음(마스터 스펙 §12 참고).

## 핵심 공식 (마스터 스펙 §4, §5에 전체 있음, 전부 상수로 분리해서 구현)
```
강화 비용(n) = 10 * 1.25^n
강화 성공률(n) = 5% + 90% * 0.82^n
판매가치(level, combo) = (level * 50) * (1 + combo * 0.15)
ATK(level) = level * 10
DUR(level) = 50 + level * 15
HP 피해 = 승자ATK * 0.3 * damageMultiplier(round)
damageMultiplier(round) = 1 + (round - 1) * 0.15
```
이 수치들은 추정값. 설정 객체로 분리해서 시뮬레이션 후 재조정 가능하게 만들 것.

## 카드 시스템 (요약, 카드 25종 전체 목록/효과/판매가는 마스터 스펙 §7)
- 획득은 오직 라운드 종료 후 상점 구매뿐 (확률 드랍 없음)
- 손패 최대 8장, 패시브 19 : 액티브 6
- 7성은 상점 레벨 6에서도 4% 가중치로만 등장 — 의도적으로 극희귀+사기
- 레벨업(중복 흡수+XP) 가능한 카드는 25종 중 3종뿐
- 카드 UI에는 성급/효과설명(description)/성급별 테두리색까지 다 있어야 완성 상태임 (이름+타입+가격만 있으면 미완성)

## 화면 흐름 / 콘텐츠 (검 30단계 이름, 봇 닉네임 20개, 화면 와이어프레임은 마스터 스펙 §8~10)
로그인 → 메인메뉴 → 매칭대기(5~8초, 안 되면 봇으로 대체, isBot은 서버 내부 전용) → 대결(손패 8슬롯 상시 노출) → 라운드 종료마다 상점 → 결과

## 보류 항목 (마스터 스펙 §11) — 먼저 묻지 않고 임의로 만들지 말 것
솔로모드(삭제됨), 튜토리얼, 사운드, 모바일 대응, 랭킹보드/카드 컬렉션 화면, 메타 수집(스킨 등)