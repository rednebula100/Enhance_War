const { enhanceCost, enhanceSuccessRate, sellValue, attackPower, durability, hpDamage } = require('../core/formulas');
const { botDecide } = require('./botAI');
const { updateMatchResult } = require('./firebase');

const GAME_CONFIG = {
  PLAYER_HP: 100,
  STARTING_COINS: 100,
  ROUND_DURATION_MS: 40_000,
  SHOP_DURATION_MS: 20_000,
  BOT_TICK_INTERVAL_MS: 6_000, // ~6 actions per round, matches simulate.js MAX_ACTIONS_PER_ROUND
  HAND_MAX: 8,
  SHOP_CARD_COUNT: 4,
};

// 스텁 카드 풀 — 25종 전체는 별도 단계에서 구현
const CARD_POOL = [
  { id: 'c001', name: '담금질',       rarity: 1, type: 'passive', cost: 20 },
  { id: 'c002', name: '숫돌',         rarity: 2, type: 'passive', cost: 35 },
  { id: 'c003', name: '강철 의지',    rarity: 3, type: 'active',  cost: 60 },
  { id: 'c004', name: '불꽃 열기',    rarity: 4, type: 'passive', cost: 100 },
  { id: 'c005', name: '비전 도면',    rarity: 5, type: 'active',  cost: 150 },
  { id: 'c006', name: '신의 망치',    rarity: 6, type: 'active',  cost: 250 },
  { id: 'c007', name: '전설의 용광로', rarity: 7, type: 'active',  cost: 400 },
];

class GameRoom {
  constructor(p1, p2) {
    // players[i]: { socket, uid, name, isBot }
    this.players = [p1, p2];
    this.swords = [
      { hp: GAME_CONFIG.PLAYER_HP, coins: GAME_CONFIG.STARTING_COINS, level: 0, combo: 0, hand: [] },
      { hp: GAME_CONFIG.PLAYER_HP, coins: GAME_CONFIG.STARTING_COINS, level: 0, combo: 0, hand: [] },
    ];
    this.round = 0;
    this.phase = null;
    this.timer = null;
    this.botInterval = null;
  }

  start() {
    this._startRound();
  }

  // Public payload used by index.js at match_found time
  matchFoundPayload(playerIdx) {
    return {
      myState: { ...this.swords[playerIdx], hand: [] },
      opponentState: this._publicSwordState(1 - playerIdx),
    };
  }

  handleEnhance(playerIdx) {
    if (this.phase !== 'ROUND') return;
    this._applyEnhance(playerIdx);
  }

  handleSell(playerIdx) {
    if (this.phase !== 'ROUND') return;
    this._applySell(playerIdx);
  }

  handleBuyCard(playerIdx, cardId) {
    if (this.phase !== 'SHOP') return;
    const sword = this.swords[playerIdx];

    if (sword.hand.length >= GAME_CONFIG.HAND_MAX) {
      return this._emit(playerIdx, 'buy_card_result', { success: false, reason: 'HAND_FULL' });
    }
    const card = CARD_POOL.find(c => c.id === cardId);
    if (!card || sword.coins < card.cost) {
      return this._emit(playerIdx, 'buy_card_result', { success: false, reason: 'INSUFFICIENT_COINS' });
    }

    sword.coins -= card.cost;
    sword.hand.push({ ...card });

    // TODO: 카드 효과 적용

    this._emit(playerIdx, 'buy_card_result', {
      success: true, cardId, coins: sword.coins, hand: sword.hand,
    });
  }

  handleSellHandCard(playerIdx, cardId) {
    if (this.phase !== 'SHOP') return;
    const sword = this.swords[playerIdx];
    const cardIdx = sword.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return;
    const card = sword.hand[cardIdx];
    const gained = Math.floor(card.cost * 0.5);
    sword.hand.splice(cardIdx, 1);
    sword.coins += gained;
    this._emit(playerIdx, 'sell_hand_card_result', {
      success: true, cardId, gained, coins: sword.coins, hand: [...sword.hand],
    });
  }

  handleDisconnect(playerIdx) {
    if (this.phase === 'ENDED') return;
    clearTimeout(this.timer);
    clearInterval(this.botInterval);
    this.swords[playerIdx].hp = 0;
    this._endMatch();
  }

  // ── Private ──────────────────────────────────────────────────

  _emit(idx, event, data) {
    const socket = this.players[idx].socket;
    if (socket) socket.emit(event, data);
  }

  _publicSwordState(idx) {
    const s = this.swords[idx];
    return { level: s.level, atk: attackPower(s.level), hp: s.hp };
  }

  _startRound() {
    this.round++;
    this.phase = 'ROUND';

    [0, 1].forEach(i => {
      this._emit(i, 'round_start', {
        round: this.round,
        timeLeft: GAME_CONFIG.ROUND_DURATION_MS / 1000,
        myState: { ...this.swords[i], hand: [...this.swords[i].hand] },
        opponentState: this._publicSwordState(1 - i),
      });
    });

    const botIdx = this.players.findIndex(p => p.isBot);
    if (botIdx !== -1) {
      this.botInterval = setInterval(() => {
        if (this.phase === 'ROUND') this._botTick(botIdx);
      }, GAME_CONFIG.BOT_TICK_INTERVAL_MS);
    }

    this.timer = setTimeout(() => this._startCombat(), GAME_CONFIG.ROUND_DURATION_MS);
  }

  _botTick(botIdx) {
    const action = botDecide(this.swords[botIdx]);
    if (action === 'sell') this._applySell(botIdx);
    else if (action === 'enhance') this._applyEnhance(botIdx);
  }

  _applyEnhance(idx) {
    const sword = this.swords[idx];
    const cost = enhanceCost(sword.level);
    if (sword.coins < cost) return;

    sword.coins -= cost;
    const success = Math.random() < enhanceSuccessRate(sword.level);
    if (success) { sword.level++; sword.combo++; }
    else { sword.level = 0; sword.combo = 0; }

    this._emit(idx, 'enhance_result', {
      success, level: sword.level, combo: sword.combo, coins: sword.coins,
    });
    // 상대에게 실시간 브로드캐스트 (거울 UI 핵심 텐션)
    this._emit(1 - idx, 'opponent_update', {
      level: sword.level, atk: attackPower(sword.level),
    });
  }

  _applySell(idx) {
    const sword = this.swords[idx];
    const gained = sellValue(sword.level, sword.combo);
    sword.coins += gained;
    sword.level = 0;
    sword.combo = 0;

    this._emit(idx, 'sell_result', { gained, coins: sword.coins });
    this._emit(1 - idx, 'opponent_update', { level: 0, atk: 0 });
  }

  _startCombat() {
    this.phase = 'COMBAT';
    clearInterval(this.botInterval);

    const atk0 = attackPower(this.swords[0].level);
    const atk1 = attackPower(this.swords[1].level);
    const dur0 = durability(this.swords[0].level);
    const dur1 = durability(this.swords[1].level);
    // ticksX = 상대 ATK에 내 DUR이 버티는 턴 수. 낮을수록 먼저 깨짐 → 패배
    const ticksA = atk1 > 0 ? Math.ceil(dur0 / atk1) : Infinity;
    const ticksB = atk0 > 0 ? Math.ceil(dur1 / atk0) : Infinity;
    let dmg0 = 0, dmg1 = 0;

    if (ticksA < ticksB) {
      dmg0 = hpDamage(atk1, this.round);
      this.swords[0].hp -= dmg0;
    } else if (ticksB < ticksA) {
      dmg1 = hpDamage(atk0, this.round);
      this.swords[1].hp -= dmg1;
    }
    // 동률(ticksA === ticksB): 피해 없음

    [0, 1].forEach(i => {
      this._emit(i, 'round_end', {
        round: this.round,
        myHp: this.swords[i].hp,
        opponentHp: this.swords[1 - i].hp,
        damageTaken: i === 0 ? dmg0 : dmg1,
      });
    });

    if (this.swords[0].hp <= 0 || this.swords[1].hp <= 0) {
      this._endMatch();
    } else {
      this.timer = setTimeout(() => this._startShop(), 500);
    }
  }

  _startShop() {
    this.phase = 'SHOP';
    const shopCards = [...CARD_POOL].sort(() => Math.random() - 0.5).slice(0, GAME_CONFIG.SHOP_CARD_COUNT);

    [0, 1].forEach(i => {
      this._emit(i, 'shop_start', {
        timeLeft: GAME_CONFIG.SHOP_DURATION_MS / 1000,
        cards: shopCards,
        myState: { coins: this.swords[i].coins, hand: [...this.swords[i].hand] },
      });
    });

    this.timer = setTimeout(() => this._startRound(), GAME_CONFIG.SHOP_DURATION_MS);
  }

  async _endMatch() {
    if (this.phase === 'ENDED') return;
    this.phase = 'ENDED';
    clearTimeout(this.timer);
    clearInterval(this.botInterval);

    const p0won = this.swords[1].hp <= 0;

    for (let i = 0; i < 2; i++) {
      const won = i === 0 ? p0won : !p0won;
      this._emit(i, 'match_end', {
        win: won,
        moneyEarned: won ? 1000 : 0,
        finalRound: this.round,
      });
      if (!this.players[i].isBot) {
        try {
          await updateMatchResult(this.players[i].uid, { won, rounds: this.round });
        } catch (e) {
          console.error(`[Firestore] updateMatchResult 실패 uid=${this.players[i].uid}`, e.message);
        }
      }
    }
  }
}

module.exports = GameRoom;