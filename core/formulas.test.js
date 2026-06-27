const { enhanceCost, enhanceSuccessRate, sellValue, attackPower, durability, hpDamage } = require('./formulas');

const LEVELS = [1, 15, 30];

console.log('=== enhanceCost(level) ===');
LEVELS.forEach(n => console.log(`  level ${n}: ${enhanceCost(n).toFixed(2)} 코인`));

console.log('\n=== enhanceSuccessRate(level) ===');
LEVELS.forEach(n => console.log(`  level ${n}: ${(enhanceSuccessRate(n) * 100).toFixed(2)}%`));

console.log('\n=== sellValue(level, combo) ===');
LEVELS.forEach(n => console.log(`  level ${n} combo 0: ${sellValue(n, 0)} | combo 5: ${sellValue(n, 5)} | combo 10: ${sellValue(n, 10)}`));

console.log('\n=== attackPower(level) ===');
LEVELS.forEach(n => console.log(`  level ${n}: ${attackPower(n)} ATK`));

console.log('\n=== durability(level) ===');
LEVELS.forEach(n => console.log(`  level ${n}: ${durability(n)} DUR`));

console.log('\n=== hpDamage(winnerAttack, round) ===');
const atk30 = attackPower(30); // level 30 검 기준
[1, 5, 10].forEach(r => console.log(`  ATK ${atk30} / round ${r}: ${hpDamage(atk30, r).toFixed(2)} HP 피해`));