const { enhanceCost } = require('../core/formulas');

const BOT_CONFIG = {
  SELL_COMBO_THRESHOLD: 3,
  SELL_PROBABILITY: 0.5,
};

// Returns 'enhance' | 'sell' | 'idle'
function botDecide(sword) {
  if (sword.combo >= BOT_CONFIG.SELL_COMBO_THRESHOLD && Math.random() < BOT_CONFIG.SELL_PROBABILITY) {
    return 'sell';
  }
  if (sword.coins < enhanceCost(sword.level)) return 'idle';
  return 'enhance';
}

module.exports = { botDecide };