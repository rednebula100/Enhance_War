const { enhanceCost, enhanceSuccessRate, sellValue, attackPower, durability, hpDamage } = require('../core/formulas');
const { botDecide } = require('./botAI');
const { updateMatchResult } = require('./firebase');

const GAME_CONFIG = {
  PLAYER_HP: 100,
  STARTING_COINS: 100,
  ROUND_DURATION_MS: 40_000,
  SHOP_DURATION_MS: 20_000,
  BOT_TICK_INTERVAL_MS: 6_000, // ~6 actions per round, matches simulate.js MAX_ACTIONS_PER_ROUND
  BASE_ENHANCE_COOLDOWN_MS: 1500, // 기본 강화 쿨타임 — c002/c019/c021 카드가 이 값에 영향
  ROUND_COIN_GRANTS: [0, 100, 120, 140, 160, 180, 200, 220, 240], // index=라운드(1~8+)
  HAND_MAX: 8,
  SHOP_CARD_COUNT: 4,
  // 상점 레벨별 설정 (§7-2)
  SHOP_LEVEL_CONFIG: [
    null,                                     // 0: 미사용
    { maxRarity: 2, upgradeCost: 300  },      // 레벨 1 → 2
    { maxRarity: 3, upgradeCost: 600  },      // 레벨 2 → 3
    { maxRarity: 4, upgradeCost: 1000 },      // 레벨 3 → 4
    { maxRarity: 5, upgradeCost: 1600 },      // 레벨 4 → 5
    { maxRarity: 6, upgradeCost: 2500 },      // 레벨 5 → 6
    { maxRarity: 7, upgradeCost: null  },     // 레벨 6: 최대, 업그레이드 없음
  ],
  // 레벨 6 성급별 가중치 (4%=7성, §7-2)
  SHOP_LV6_WEIGHTS: { 3: 38, 4: 28, 5: 19, 6: 11, 7: 4 },
};

// 성급별 구매가 / 판매가 — 밸런스 상수
const CARD_COST       = { 1: 60,  2: 100, 3: 180, 4: 300, 5: 500, 6: 800,  7: 1500 };
const CARD_SELL_PRICE = { 1: 30,  2: 60,  3: 120, 4: 220, 5: 400, 6: 700,  7: 1200 };

const CARD_POOL = [
  // ── 패시브 (19종) ─────────────────────────────────────────────────────────
  { id:'c001', name:'초심자의 행운',  rarity:1, type:'passive', levelable:true,
    cost:CARD_COST[1], sellPrice:CARD_SELL_PRICE[1],
    description:'강화 성공률 +3%p' },
  { id:'c002', name:'민첩한 손놀림', rarity:1, type:'passive', levelable:true,
    cost:CARD_COST[1], sellPrice:CARD_SELL_PRICE[1],
    description:'강화 쿨타임 -10%' },
  { id:'c003', name:'재물운의 인장', rarity:1, type:'passive', levelable:true,
    cost:CARD_COST[1], sellPrice:CARD_SELL_PRICE[1],
    description:'판매가치 +10%' },
  { id:'c004', name:'단단한 손잡이', rarity:1, type:'passive', levelable:false,
    cost:CARD_COST[1], sellPrice:CARD_SELL_PRICE[1],
    description:'내구도 +10%' },
  { id:'c005', name:'끈기',          rarity:1, type:'passive', levelable:false,
    cost:CARD_COST[1], sellPrice:CARD_SELL_PRICE[1],
    description:'강화 실패해도 코인 손실 없음 (비용 환불)' },
  { id:'c006', name:'이중 콤보',     rarity:2, type:'passive', levelable:false,
    cost:CARD_COST[2], sellPrice:CARD_SELL_PRICE[2],
    description:'콤보 3 이상일 때 판매가치 추가 +20%' },
  { id:'c007', name:'냉기 갑주',     rarity:2, type:'passive', levelable:false,
    cost:CARD_COST[2], sellPrice:CARD_SELL_PRICE[2],
    description:'상대 방해 카드 효과 50% 감소' },
  { id:'c008', name:'노련한 감각',   rarity:2, type:'passive', levelable:false,
    cost:CARD_COST[2], sellPrice:CARD_SELL_PRICE[2],
    description:'강화 성공률 +(현재 콤보×1.5)%p' },
  { id:'c009', name:'풍요의 손',     rarity:2, type:'passive', levelable:false,
    cost:CARD_COST[2], sellPrice:CARD_SELL_PRICE[2],
    description:'라운드 시작 지급 코인 +30' },
  { id:'c010', name:'탐욕의 표식',   rarity:3, type:'passive', levelable:false,
    cost:CARD_COST[3], sellPrice:CARD_SELL_PRICE[3],
    description:'강화 비용 +5%, 성공 시 코인 추가 획득' },
  { id:'c011', name:'단조의 정수',   rarity:3, type:'passive', levelable:false,
    cost:CARD_COST[3], sellPrice:CARD_SELL_PRICE[3],
    description:'강화단계가 오를수록 판매가치 누적 보너스 (+5%×단계)' },
  { id:'c012', name:'불굴의 의지',   rarity:3, type:'passive', levelable:false,
    cost:CARD_COST[3], sellPrice:CARD_SELL_PRICE[3],
    description:'강화 실패해도 콤보 1로 유지' },
  { id:'c013', name:'환전상',        rarity:3, type:'passive', levelable:false,
    cost:CARD_COST[3], sellPrice:CARD_SELL_PRICE[3],
    description:'검 판매 시 판매가의 +15% 추가 코인' },
  { id:'c014', name:'보험증서',      rarity:4, type:'passive', levelable:false,
    cost:CARD_COST[4], sellPrice:CARD_SELL_PRICE[4],
    description:'라운드 시작 시 강화 실패 1회 무효화' },
  { id:'c015', name:'강철의 의지',   rarity:4, type:'passive', levelable:false,
    cost:CARD_COST[4], sellPrice:CARD_SELL_PRICE[4],
    description:'내구도 +25%' },
  { id:'c016', name:'백전노장',      rarity:4, type:'passive', levelable:false,
    cost:CARD_COST[4], sellPrice:CARD_SELL_PRICE[4],
    description:'라운드가 지날수록 ATK 추가 증가 (+5×라운드)' },
  { id:'c017', name:'환전상의 제자', rarity:5, type:'passive', levelable:false,
    cost:CARD_COST[5], sellPrice:CARD_SELL_PRICE[5],
    description:'라운드 시작마다 "환전상" 카드 1장 무료 획득' },
  { id:'c018', name:'복수의 칼날',   rarity:5, type:'passive', levelable:false,
    cost:CARD_COST[5], sellPrice:CARD_SELL_PRICE[5],
    description:'내 HP 50% 이하일 때 ATK +30%' },
  { id:'c019', name:'시간의 흐름',   rarity:6, type:'passive', levelable:false,
    cost:CARD_COST[6], sellPrice:CARD_SELL_PRICE[6],
    description:'강화 쿨타임이 라운드마다 5%씩 자동 감소' },
  // ── 액티브 (6종) ──────────────────────────────────────────────────────────
  { id:'c020', name:'균열',          rarity:2, type:'active',  levelable:false,
    cost:CARD_COST[2], sellPrice:CARD_SELL_PRICE[2],
    description:'상대 다음 강화 성공률 -10%p' },
  { id:'c021', name:'저주의 망치',   rarity:3, type:'active',  levelable:false,
    cost:CARD_COST[3], sellPrice:CARD_SELL_PRICE[3],
    description:'상대 강화 쿨타임 +1초 (3초간)' },
  { id:'c022', name:'소매치기',      rarity:4, type:'active',  levelable:false,
    cost:CARD_COST[4], sellPrice:CARD_SELL_PRICE[4],
    description:'상대 코인 10% 훔쳐옴' },
  { id:'c023', name:'냉정한 청산',   rarity:5, type:'active',  levelable:false,
    cost:CARD_COST[5], sellPrice:CARD_SELL_PRICE[5],
    description:'즉시 판매 + 판매가치 +20%' },
  { id:'c024', name:'무적의 기염',   rarity:7, type:'active',  levelable:false,
    cost:CARD_COST[7], sellPrice:CARD_SELL_PRICE[7],
    description:'이번 라운드 동안 받는 HP 피해 0' },
  { id:'c025', name:'천검일도',      rarity:7, type:'active',  levelable:false,
    cost:CARD_COST[7], sellPrice:CARD_SELL_PRICE[7],
    description:'이번 교전에서 ATK ×1000 (확정 승리)' },
];

class GameRoom {
  constructor(p1, p2) {
    // players[i]: { socket, uid, name, isBot }
    this.players = [p1, p2];
    this.swords = [
      { hp: GAME_CONFIG.PLAYER_HP, coins: GAME_CONFIG.STARTING_COINS, level: 0, combo: 0, hand: [],
        shopLevel: 1, lastEnhanceMs: 0, insuranceActive: false, slowDebuffExpiry: 0,
        crackedDebuff: false, invincible: false, godSword: false },
      { hp: GAME_CONFIG.PLAYER_HP, coins: GAME_CONFIG.STARTING_COINS, level: 0, combo: 0, hand: [],
        shopLevel: 1, lastEnhanceMs: 0, insuranceActive: false, slowDebuffExpiry: 0,
        crackedDebuff: false, invincible: false, godSword: false },
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
    const sword = this.swords[playerIdx];
    const cd = this._enhanceCooldown(playerIdx);
    if (Date.now() - sword.lastEnhanceMs < cd) return;
    sword.lastEnhanceMs = Date.now();
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

    // levelable 카드 중복 구매 → 흡수 + XP
    if (card.levelable) {
      const existing = sword.hand.find(c => c.id === cardId);
      if (existing) {
        sword.coins -= card.cost;
        existing.xp = (existing.xp || 0) + 1;
        const prevLv = existing.xpLevel || 1;
        // 임계치: Lv1→Lv2: xp 3, Lv2→Lv3: xp 8
        const thresholds = [0, 3, 8];
        const newLv = thresholds.findIndex(t => (existing.xp || 0) < t);
        existing.xpLevel = newLv === -1 ? 3 : Math.max(1, newLv);
        const leveled = existing.xpLevel > prevLv;
        this._emit(playerIdx, 'buy_card_result', {
          success: true, absorbed: true, cardId,
          coins: sword.coins, hand: sword.hand, leveled,
        });
        return;
      }
    }

    sword.coins -= card.cost;
    sword.hand.push({ ...card, xp: 0, xpLevel: 1 });

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
    const gained = card.sellPrice;
    sword.hand.splice(cardIdx, 1);
    sword.coins += gained;
    this._emit(playerIdx, 'sell_hand_card_result', {
      success: true, cardId, gained, coins: sword.coins, hand: [...sword.hand],
    });
  }

  handleUseCard(playerIdx, cardId) {
    if (this.phase !== 'ROUND') return;
    const sword  = this.swords[playerIdx];
    const opp    = this.swords[1 - playerIdx];
    const cardIdx = sword.hand.findIndex(c => c.id === cardId && c.type === 'active');
    if (cardIdx === -1) return;
    const card = sword.hand[cardIdx];

    // 냉기 갑주(c007) 적용: 상대가 보유 시 효과 50% 감소
    const oppHasColdArmor = opp.hand.some(c => c.id === 'c007');
    const debuffScale = oppHasColdArmor ? 0.5 : 1.0;

    let notify = null; // 상대에게 보낼 이벤트

    switch (cardId) {
      case 'c020': // 균열: 상대 다음 강화 성공률 -10%p
        opp.crackedDebuff = true;
        notify = { event: 'card_effect', data: { effect: 'cracked', value: 0.10 * debuffScale } };
        break;
      case 'c021': // 저주의 망치: 상대 쿨타임 +1초 (3초간)
        opp.slowDebuffExpiry = Date.now() + 3000;
        notify = { event: 'card_effect', data: { effect: 'slow', durationMs: 3000 } };
        break;
      case 'c022': // 소매치기: 상대 코인 10% 훔침
        const steal = Math.floor(opp.coins * 0.10 * debuffScale);
        opp.coins  -= steal;
        sword.coins += steal;
        notify = { event: 'card_effect', data: { effect: 'stolen', amount: steal } };
        this._emit(playerIdx,     'use_card_result', { success: true, cardId, coins: sword.coins });
        this._emit(1 - playerIdx, 'opponent_update', { level: opp.level, atk: attackPower(opp.level), coins: opp.coins });
        sword.hand.splice(cardIdx, 1);
        this._emit(playerIdx, 'hand_update', { hand: sword.hand });
        if (notify) this._emit(1 - playerIdx, notify.event, notify.data);
        return;
      case 'c023': // 냉정한 청산: 즉시 판매 + 판매가치 +20%
        this._applySell(playerIdx, 1.20);
        sword.hand.splice(cardIdx, 1);
        this._emit(playerIdx, 'hand_update', { hand: sword.hand });
        return;
      case 'c024': // 무적의 기염: 이번 라운드 HP 피해 0
        sword.invincible = true;
        break;
      case 'c025': // 천검일도: 이번 교전 ATK ×1000
        sword.godSword = true;
        break;
      default:
        return; // 알 수 없는 카드
    }

    // 사용한 카드 손패에서 제거
    sword.hand.splice(cardIdx, 1);
    this._emit(playerIdx, 'use_card_result', { success: true, cardId, hand: sword.hand });
    this._emit(playerIdx, 'hand_update', { hand: sword.hand });
    if (notify) this._emit(1 - playerIdx, notify.event, notify.data);
  }

  handleUpgradeShop(playerIdx) {
    if (this.phase !== 'SHOP') return;
    const sword = this.swords[playerIdx];
    const cfg = GAME_CONFIG.SHOP_LEVEL_CONFIG[sword.shopLevel];
    if (!cfg || cfg.upgradeCost === null) return; // 최대 레벨
    if (sword.coins < cfg.upgradeCost) {
      return this._emit(playerIdx, 'shop_upgrade_result', { success: false, reason: 'INSUFFICIENT_COINS' });
    }
    sword.coins -= cfg.upgradeCost;
    sword.shopLevel++;
    const newCards = this._drawShopCards(sword.shopLevel);
    this._emit(playerIdx, 'shop_upgrade_result', {
      success: true, shopLevel: sword.shopLevel, coins: sword.coins, cards: newCards,
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

  // 패시브 카드 효과 집계
  _passiveMods(idx) {
    const sword = this.swords[idx];
    const m = {
      successRateBonus: 0, costMul: 1, sellMul: 1,
      durMul: 1, atkBonus: 0,
      refundOnFail: false, keepComboOnFail: false,
      onSuccessCoinBonus: 0,
    };
    for (const card of sword.hand) {
      if (card.type !== 'passive') continue;
      const lv = card.xpLevel || 1;
      switch (card.id) {
        case 'c001': m.successRateBonus += 0.03 * lv; break;             // 초심자의 행운
        case 'c003': m.sellMul *= 1 + 0.10 * lv; break;                  // 재물운의 인장
        case 'c004': m.durMul  *= 1.10; break;                            // 단단한 손잡이
        case 'c005': m.refundOnFail = true; break;                        // 끈기
        case 'c006': if (sword.combo >= 3) m.sellMul *= 1.20; break;      // 이중 콤보
        case 'c007': break;                                                // 냉기 갑주 (액티브 카드 효과에서 처리)
        case 'c008': m.successRateBonus += sword.combo * 0.015; break;    // 노련한 감각
        case 'c010': m.costMul *= 1.05;                                    // 탐욕의 표식
                     m.onSuccessCoinBonus += enhanceCost(sword.level) * 0.05 * m.costMul; break;
        case 'c011': m.sellMul *= (1 + sword.level * 0.05); break;        // 단조의 정수
        case 'c012': m.keepComboOnFail = true; break;                     // 불굴의 의지
        case 'c013': m.sellMul *= 1.15; break;                            // 환전상
        case 'c015': m.durMul  *= 1.25; break;                            // 강철의 의지
        case 'c016': m.atkBonus += 5 * this.round; break;                 // 백전노장
        case 'c018': if (sword.hp <= 50) m.atkBonus += attackPower(sword.level) * 0.30; break; // 복수의 칼날
      }
    }
    return m;
  }

  // 강화 쿨타임 계산 (ms)
  _enhanceCooldown(idx) {
    const sword = this.swords[idx];
    let cd = GAME_CONFIG.BASE_ENHANCE_COOLDOWN_MS;
    for (const card of sword.hand) {
      const lv = card.xpLevel || 1;
      if (card.id === 'c002') cd *= (1 - 0.10 * lv);  // 민첩한 손놀림
      if (card.id === 'c019') cd *= Math.max(0.1, 1 - 0.05 * this.round); // 시간의 흐름
    }
    if (sword.slowDebuffExpiry && Date.now() < sword.slowDebuffExpiry) cd += 1000; // 저주의 망치
    return Math.max(200, cd);
  }

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

    // 라운드별 코인 지급 (§2 표)
    const grantIdx = Math.min(this.round, GAME_CONFIG.ROUND_COIN_GRANTS.length - 1);
    const baseGrant = GAME_CONFIG.ROUND_COIN_GRANTS[grantIdx];
    [0, 1].forEach(i => {
      const sword = this.swords[i];
      let grant = baseGrant;
      for (const card of sword.hand) {
        if (card.id === 'c009') grant += 30; // 풍요의 손
      }
      sword.coins += grant;

      // c014 보험증서: 라운드 시작마다 보험 활성화
      sword.insuranceActive = sword.hand.some(c => c.id === 'c014');

      // c017 환전상의 제자: 손패 여유 있으면 "환전상"(c013) 무료 지급
      if (sword.hand.length < GAME_CONFIG.HAND_MAX && sword.hand.some(c => c.id === 'c017')) {
        const freeCard = CARD_POOL.find(c => c.id === 'c013');
        if (freeCard) sword.hand.push({ ...freeCard });
      }
    });

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
    const m = this._passiveMods(idx);
    const baseCost = enhanceCost(sword.level);
    const cost = Math.ceil(baseCost * m.costMul);
    if (sword.coins < cost) return;

    // c005 끈기: 실패 시 환불 위해 미리 차감, 실패면 되돌림
    sword.coins -= cost;

    const crackedPenalty = sword.crackedDebuff ? -0.10 : 0;
    sword.crackedDebuff = false;
    const rawRate = enhanceSuccessRate(sword.level) + m.successRateBonus + crackedPenalty;
    const success = Math.random() < Math.max(0, Math.min(1, rawRate));

    if (success) {
      sword.level++; sword.combo++;
      if (m.onSuccessCoinBonus > 0) sword.coins += Math.floor(m.onSuccessCoinBonus); // c010 탐욕의 표식
    } else if (sword.insuranceActive) {
      // c014 보험증서: 실패 1회 무효 (단계 유지, 환불)
      sword.insuranceActive = false;
      sword.coins += cost;
    } else {
      if (m.refundOnFail) sword.coins += cost;  // c005 끈기
      sword.level = 0;
      sword.combo = m.keepComboOnFail ? 1 : 0;  // c012 불굴의 의지
    }

    this._emit(idx, 'enhance_result', {
      success, level: sword.level, combo: sword.combo, coins: sword.coins,
    });
    // 상대에게 실시간 브로드캐스트 (거울 UI 핵심 텐션)
    this._emit(1 - idx, 'opponent_update', {
      level: sword.level, atk: attackPower(sword.level),
    });
  }

  _applySell(idx, bonusMul = 1) {
    const sword = this.swords[idx];
    const m = this._passiveMods(idx);
    const base = sellValue(sword.level, sword.combo);
    const gained = Math.floor(base * m.sellMul * bonusMul);
    sword.coins += gained;
    sword.level = 0;
    sword.combo = 0;

    this._emit(idx, 'sell_result', { gained, coins: sword.coins });
    this._emit(1 - idx, 'opponent_update', { level: 0, atk: 0 });
  }

  _startCombat() {
    this.phase = 'COMBAT';
    clearInterval(this.botInterval);

    const m0 = this._passiveMods(0);
    const m1 = this._passiveMods(1);

    // 천검일도(c025): ATK ×1000, 발동 후 손패에서 제거
    let atk0 = attackPower(this.swords[0].level) + m0.atkBonus;
    let atk1 = attackPower(this.swords[1].level) + m1.atkBonus;
    if (this.swords[0].godSword) { atk0 *= 1000; this.swords[0].godSword = false; this._removeCardFromHand(0, 'c025'); }
    if (this.swords[1].godSword) { atk1 *= 1000; this.swords[1].godSword = false; this._removeCardFromHand(1, 'c025'); }

    // c004/c015: DUR 보정
    const dur0 = durability(this.swords[0].level) * m0.durMul;
    const dur1 = durability(this.swords[1].level) * m1.durMul;

    const ticksA = atk1 > 0 ? Math.ceil(dur0 / atk1) : Infinity;
    const ticksB = atk0 > 0 ? Math.ceil(dur1 / atk0) : Infinity;
    let dmg0 = 0, dmg1 = 0;

    if (ticksA < ticksB) {
      dmg0 = this.swords[0].invincible ? 0 : hpDamage(atk1, this.round);
      this.swords[0].hp -= dmg0;
    } else if (ticksB < ticksA) {
      dmg1 = this.swords[1].invincible ? 0 : hpDamage(atk0, this.round);
      this.swords[1].hp -= dmg1;
    }
    // 동률(ticksA === ticksB): 피해 없음
    this.swords[0].invincible = false;
    this.swords[1].invincible = false;

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

  _drawShopCards(shopLv) {
    const cfg = GAME_CONFIG.SHOP_LEVEL_CONFIG[shopLv];
    const maxR = cfg ? cfg.maxRarity : 2;
    const minR = shopLv >= 4 ? 2 : 1;
    const pool = CARD_POOL.filter(c => c.rarity >= minR && c.rarity <= maxR);
    if (shopLv < 6) {
      return pool.sort(() => Math.random() - 0.5).slice(0, GAME_CONFIG.SHOP_CARD_COUNT);
    }
    // 레벨 6: 7성 4% 가중치 샘플링
    const weights = GAME_CONFIG.SHOP_LV6_WEIGHTS;
    const result = [];
    const used = new Set();
    for (let n = 0; n < GAME_CONFIG.SHOP_CARD_COUNT; n++) {
      const eligible = pool.filter(c => !used.has(c.id));
      if (!eligible.length) break;
      const totalW = eligible.reduce((s, c) => s + (weights[c.rarity] ?? 1), 0);
      let roll = Math.random() * totalW;
      const picked = eligible.find(c => { roll -= (weights[c.rarity] ?? 1); return roll <= 0; }) ?? eligible[0];
      result.push(picked);
      used.add(picked.id);
    }
    return result;
  }

  _startShop() {
    this.phase = 'SHOP';
    [0, 1].forEach(i => {
      const shopCards = this._drawShopCards(this.swords[i].shopLevel);
      this._emit(i, 'shop_start', {
        timeLeft: GAME_CONFIG.SHOP_DURATION_MS / 1000,
        cards: shopCards,
        myState: { coins: this.swords[i].coins, hand: [...this.swords[i].hand], shopLevel: this.swords[i].shopLevel },
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