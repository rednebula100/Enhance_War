const { enhanceCost, enhanceSuccessRate, sellValue, attackPower, hpDamage } = require('./formulas');

const SIM_CONFIG = {
  PLAYER_HP: 100,          // HP 미지정 — 추정값
  STARTING_COINS: 100,     // 시작 코인 미지정 — 추정값
  MAX_ACTIONS_PER_ROUND: 6, // 40초 창의 행동 횟수 — 추정값
  SELL_COMBO_THRESHOLD: 3,
  SELL_PROBABILITY: 0.5,
  TOTAL_MATCHES: 500,
  SHOP_SEVEN_STAR_RATE: 0.04,
  SHOP_OPENINGS: 100,
  SHOP_RUNS: 10000,
  // 시뮬레이션 전용 안전망 — 게임 규칙의 라운드 캡 아님
  SIMULATION_ROUND_LIMIT: 500,
};

function createPlayer() {
  return { hp: SIM_CONFIG.PLAYER_HP, coins: SIM_CONFIG.STARTING_COINS, level: 0, combo: 0 };
}

function takeTick(player) {
  const shouldSell = player.combo >= SIM_CONFIG.SELL_COMBO_THRESHOLD
    && Math.random() < SIM_CONFIG.SELL_PROBABILITY;

  if (shouldSell) {
    player.coins += sellValue(player.level, player.combo);
    player.level = 0;
    player.combo = 0;
    return;
  }

  const cost = enhanceCost(player.level);
  if (player.coins < cost) return;
  player.coins -= cost;
  if (Math.random() < enhanceSuccessRate(player.level)) {
    player.level++;
    player.combo++;
  }
  // 실패: 단계 유지 (CLAUDE.md: 실패는 단계 유지, 판매만 단계 0 리셋)
}

function simulateRound(player) {
  for (let i = 0; i < SIM_CONFIG.MAX_ACTIONS_PER_ROUND; i++) {
    takeTick(player);
  }
}

function simulateMatch() {
  const p1 = createPlayer();
  const p2 = createPlayer();
  let round = 0;
  let hitLimit = false;

  while (p1.hp > 0 && p2.hp > 0) {
    round++;
    simulateRound(p1);
    simulateRound(p2);

    const atk1 = attackPower(p1.level);
    const atk2 = attackPower(p2.level);

    if (atk1 > atk2) p2.hp -= hpDamage(atk1, round);
    else if (atk2 > atk1) p1.hp -= hpDamage(atk2, round);
    // 동률: 이번 라운드 피해 없음

    if (round >= SIM_CONFIG.SIMULATION_ROUND_LIMIT) { hitLimit = true; break; }
  }

  return { round, hitLimit };
}

// ── 매치 시뮬레이션 ──────────────────────────────
const results = Array.from({ length: SIM_CONFIG.TOTAL_MATCHES }, simulateMatch);
const rounds = results.map(r => r.round);
const limitHits = results.filter(r => r.hitLimit).length;
const avg = rounds.reduce((a, b) => a + b, 0) / rounds.length;
const min = Math.min(...rounds);
const max = Math.max(...rounds);
const pct = (fn) => (rounds.filter(fn).length / rounds.length * 100).toFixed(1);

console.log(`=== 매치 시뮬레이션 결과 (${SIM_CONFIG.TOTAL_MATCHES}판) ===`);
console.log(`  평균 라운드 수: ${avg.toFixed(2)}`);
console.log(`  최소: ${min}R  최대: ${max}R`);
console.log(`  분포: 1~5R ${pct(r => r <= 5)}%  |  6~10R ${pct(r => r >= 6 && r <= 10)}%  |  11+R ${pct(r => r >= 11)}%`);
if (limitHits > 0) console.warn(`  ⚠ 안전망(${SIM_CONFIG.SIMULATION_ROUND_LIMIT}R) 도달: ${limitHits}건`);

// ── 7성 카드 빈도 시뮬레이션 ─────────────────────
const sevenCounts = Array.from({ length: SIM_CONFIG.SHOP_RUNS }, () => {
  let count = 0;
  for (let i = 0; i < SIM_CONFIG.SHOP_OPENINGS; i++) {
    if (Math.random() < SIM_CONFIG.SHOP_SEVEN_STAR_RATE) count++;
  }
  return count;
});
const avgSeven = sevenCounts.reduce((a, b) => a + b, 0) / sevenCounts.length;
const pctSeven = (fn) => (sevenCounts.filter(fn).length / sevenCounts.length * 100).toFixed(1);

console.log(`\n=== 7성 카드 빈도 (상점 ${SIM_CONFIG.SHOP_OPENINGS}회 × ${SIM_CONFIG.SHOP_RUNS}번 반복) ===`);
console.log(`  평균 등장 횟수: ${avgSeven.toFixed(2)}번`);
console.log(`  한 번도 안 나온 경우: ${pctSeven(c => c === 0)}%`);
console.log(`  1번 이상 나온 경우:   ${pctSeven(c => c >= 1)}%`);
console.log(`  3번 이상 나온 경우:   ${pctSeven(c => c >= 3)}%`);
console.log(`  5번 이상 나온 경우:   ${pctSeven(c => c >= 5)}%`);