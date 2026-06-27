const Result = (() => {
  let getSocket;

  function init(socketGetter) {
    getSocket = socketGetter;
    document.getElementById('btn-back-menu').addEventListener('click', () => {
      showScreen('screen-menu');
    });
  }

  function onMatchEnd({ win, moneyEarned, finalRound }) {
    const badge = document.getElementById('result-badge');
    badge.textContent = win ? '승리' : '패배';
    badge.className = win ? 'result-badge' : 'result-badge lose';
    document.getElementById('result-round').textContent = `${finalRound}라운드`;
    document.getElementById('result-money').textContent = `+${moneyEarned.toLocaleString()}원`;
    if (moneyEarned > 0) {
      const moneyEl = document.getElementById('menu-money');
      const m = moneyEl.textContent.match(/[\d,]+/);
      const prev = m ? parseInt(m[0].replace(/,/g, ''), 10) : 0;
      moneyEl.textContent = `💰 ${(prev + moneyEarned).toLocaleString()}원`;
    }
  }

  return { init, onMatchEnd };
})();