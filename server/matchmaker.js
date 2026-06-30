const BOT_NAMES = [
  '검소년99', '단조왕', '강화매니아', '풀강검사', '야매대장장이',
  '검은칼날', '무명의대장', '떡상기원', '검술초보', '강화실패요정',
  '한칼승부사', '골드모으는중', '검질하는개발자', '야밤의대장간', '천재타격감',
  '손모가지조심', '운빨도실력', '검파괴전문가', '무한도전중', '결전의시간',
];

const queue = [];
const queued = new Set();

const MATCHMAKER_CONFIG = {
  MIN_WAIT_MS: 5_000,
  MAX_WAIT_MS: 8_000,
};

// player: { socket, uid, name }
// onMatch(p1, p2) called when two players are paired
function joinQueue(player, onMatch) {
  if (queued.has(player.uid)) return;
  queued.add(player.uid);

  const waiting = queue.shift();
  if (waiting) {
    clearTimeout(waiting.timer);
    queued.delete(waiting.uid);
    queued.delete(player.uid);
    onMatch(waiting, player);
    return;
  }

  const delay = MATCHMAKER_CONFIG.MIN_WAIT_MS +
    Math.random() * (MATCHMAKER_CONFIG.MAX_WAIT_MS - MATCHMAKER_CONFIG.MIN_WAIT_MS);

  const timer = setTimeout(() => {
    const idx = queue.findIndex(p => p.uid === player.uid);
    if (idx === -1) return;
    queue.splice(idx, 1);
    queued.delete(player.uid);
    onMatch(player, _createBot());
  }, delay);

  queue.push({ ...player, timer });
}

function leaveQueue(uid) {
  const idx = queue.findIndex(p => p.uid === uid);
  if (idx !== -1) {
    clearTimeout(queue[idx].timer);
    queue.splice(idx, 1);
  }
  queued.delete(uid);
}

function _createBot() {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return { socket: null, uid: `bot_${Date.now()}`, name, isBot: true };
}

module.exports = { joinQueue, leaveQueue };