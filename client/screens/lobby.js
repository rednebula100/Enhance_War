const Lobby = (() => {
  let getSocket;
  let _playerData = { displayName: '', money: 0, bestRound: 0 };

  function init(socketGetter) {
    getSocket = socketGetter;

    document.getElementById('btn-start-match').addEventListener('click', () => {
      getSocket()?.emit('join_queue');
      // 서버 확인 전 낙관적으로 오버레이 표시
      showQueueOverlay();
    });

    document.getElementById('btn-cancel-queue').addEventListener('click', () => {
      getSocket()?.emit('leave_queue');
      hideQueueOverlay();
    });

    document.getElementById('btn-ranking').addEventListener('click', () => {
      alert('준비 중입니다.');
    });

    document.getElementById('btn-collection').addEventListener('click', () => {
      alert('준비 중입니다.');
    });

    document.getElementById('profile-box')?.addEventListener('click', _showProfilePopup);
    document.getElementById('btn-close-profile')?.addEventListener('click', () => {
      const p = document.getElementById('profile-popup');
      if (p) p.style.display = 'none';
    });
  }

  function showQueueOverlay() {
    document.getElementById('queue-overlay').style.display = 'flex';
  }

  function hideQueueOverlay() {
    document.getElementById('queue-overlay').style.display = 'none';
  }

  function _showProfilePopup() {
    const popup = document.getElementById('profile-popup');
    if (!popup) return;
    document.getElementById('popup-name').textContent = _playerData.displayName;
    document.getElementById('popup-money').textContent = (_playerData.money || 0).toLocaleString() + '원';
    document.getElementById('popup-best-round').textContent = (_playerData.bestRound || 0) + '라운드';
    popup.style.display = 'flex';
  }

  function onAuthOk({ displayName, money, bestRound }) {
    _playerData = { displayName: displayName || '플레이어', money: money || 0, bestRound: bestRound || 0 };
    document.getElementById('menu-name').textContent = displayName || '플레이어';
    document.getElementById('menu-money').textContent = `💰 ${(money || 0).toLocaleString()}원`;
  }

  function onQueueJoined() {
    showQueueOverlay();
  }

  return { init, onAuthOk, onQueueJoined, hideQueueOverlay };
})();