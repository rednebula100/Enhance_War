const Lobby = (() => {
  let getSocket;

  function init(socketGetter) {
    getSocket = socketGetter;

    document.getElementById('btn-start-match').addEventListener('click', () => {
      getSocket()?.emit('join_queue');
      showScreen('screen-queue');
    });

    document.getElementById('btn-cancel-queue').addEventListener('click', () => {
      getSocket()?.emit('leave_queue');
      showScreen('screen-menu');
    });
  }

  function onAuthOk({ displayName, money }) {
    document.getElementById('menu-name').textContent = displayName || '플레이어';
    document.getElementById('menu-money').textContent = `💰 ${(money || 0).toLocaleString()}원`;
  }

  function onQueueJoined() {
    showScreen('screen-queue');
  }

  return { init, onAuthOk, onQueueJoined };
})();