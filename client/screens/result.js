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
    badge.style.color = win ? '#ffd76a' : '#cfd2db';
    badge.style.textShadow = win ? '0 0 24px rgba(245,170,60,.7),3px 4px 0 #000' : '3px 4px 0 #000';
    document.getElementById('result-round').textContent = `${finalRound}라운드`;
    document.getElementById('result-money').textContent = `₩${moneyEarned.toLocaleString()}`;
    if (moneyEarned > 0) {
      const moneyEl = document.getElementById('menu-money');
      const prev = parseInt(moneyEl.textContent.replace(/[^0-9]/g, ''), 10) || 0;
      moneyEl.textContent = (prev + moneyEarned).toLocaleString();
    }
  }

  return { init, onMatchEnd };
})();