const BALANCE_CONFIG = {
  // enhanceCost(n) = BASE_COST * COST_MULTIPLIER^n
  BASE_COST: 10,
  COST_MULTIPLIER: 1.25,

  // enhanceSuccessRate(n) = BASE_SUCCESS_RATE + SUCCESS_RATE_RANGE * RATE_DECAY^n
  BASE_SUCCESS_RATE: 0.05,
  SUCCESS_RATE_RANGE: 0.90,
  RATE_DECAY: 0.82,

  // sellValue(level, combo) = level * LEVEL_COIN_VALUE * (1 + combo * COMBO_BONUS)
  LEVEL_COIN_VALUE: 50,
  COMBO_BONUS: 0.15,

  // attackPower(level) = level * ATK_PER_LEVEL
  ATK_PER_LEVEL: 10,

  // durability(level) = BASE_DUR + level * DUR_PER_LEVEL
  BASE_DUR: 50,
  DUR_PER_LEVEL: 15,

  // hpDamage: winnerAttack * DAMAGE_RATIO * (1 + (round - 1) * ESCALATION_PER_ROUND)
  DAMAGE_RATIO: 0.3,
  ESCALATION_PER_ROUND: 0.15,
};

function enhanceCost(level) {
  return BALANCE_CONFIG.BASE_COST * Math.pow(BALANCE_CONFIG.COST_MULTIPLIER, level);
}

function enhanceSuccessRate(level) {
  return BALANCE_CONFIG.BASE_SUCCESS_RATE + BALANCE_CONFIG.SUCCESS_RATE_RANGE * Math.pow(BALANCE_CONFIG.RATE_DECAY, level);
}

function sellValue(level, combo) {
  return (level * BALANCE_CONFIG.LEVEL_COIN_VALUE) * (1 + combo * BALANCE_CONFIG.COMBO_BONUS);
}

function attackPower(level) {
  return level * BALANCE_CONFIG.ATK_PER_LEVEL;
}

function durability(level) {
  return BALANCE_CONFIG.BASE_DUR + level * BALANCE_CONFIG.DUR_PER_LEVEL;
}

function hpDamage(winnerAttack, round) {
  const multiplier = 1 + (round - 1) * BALANCE_CONFIG.ESCALATION_PER_ROUND;
  return winnerAttack * BALANCE_CONFIG.DAMAGE_RATIO * multiplier;
}

module.exports = { BALANCE_CONFIG, enhanceCost, enhanceSuccessRate, sellValue, attackPower, durability, hpDamage };