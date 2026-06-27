const Lobby = (() => {
  let getSocket;

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
  }

  function showQueueOverlay() {
    document.getElementById('queue-overlay').classList.add('active');
  }

  function hideQueueOverlay() {
    document.getElementById('queue-overlay').classList.remove('active');
  }

  function onAuthOk({ displayName, money }) {
    document.getElementById('menu-name').textContent = displayName || '플레이어';
    document.getElementById('menu-money').textContent = `💰 ${(money || 0).toLocaleString()}원`;
  }

  function onQueueJoined() {
    showQueueOverlay();
  }

  return { init, onAuthOk, onQueueJoined, hideQueueOverlay };
})();