const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBr3dL9J6MjOERZa_3m5FWqvNnDNKIXmwQ",
  authDomain: "enhance-war.firebaseapp.com",
  projectId: "enhance-war",
  storageBucket: "enhance-war.firebasestorage.app",
  messagingSenderId: "258803285733",
  appId: "1:258803285733:web:e84d3e44a46bbec2aade0c",
};

const SERVER_URL = "https://enhance-war.onrender.com";

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();

let socket = null;

// ── 화면 전환 ─────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Socket.io 연결 및 전역 이벤트 ─────────────
function connectSocket(idToken) {
  socket = io(SERVER_URL, { auth: { idToken } });

  socket.on('connect', () => {
    socket.emit('auth', { idToken });
  });

  socket.on('auth_ok', (data) => {
    window.myUid = data.uid;
    window.myDisplayName = data.displayName || '플레이어';
    Lobby.onAuthOk(data);
    showScreen('screen-menu');
  });

  socket.on('error', (err) => {
    console.error('[socket error]', err);
  });

  socket.on('queue_joined',  ()     => Lobby.onQueueJoined());
  socket.on('match_found',   (data) => { Lobby.hideQueueOverlay(); Game.onMatchFound(data); showScreen('screen-game'); });
  socket.on('round_start',   (data) => { Game.onRoundStart(data); showScreen('screen-game'); });
  socket.on('enhance_result',(data) => Game.onEnhanceResult(data));
  socket.on('sell_result',   (data) => Game.onSellResult(data));
  socket.on('opponent_update',(data)=> Game.onOpponentUpdate(data));
  socket.on('round_end',     async (data) => { await Game.onRoundEnd(data); });
  socket.on('shop_start',    (data) => { Shop.onShopStart(data); showScreen('screen-shop'); });
  socket.on('buy_card_result',    (data) => Shop.onBuyCardResult(data));
  socket.on('sell_hand_card_result',  (data) => Shop.onSellHandCardResult(data));
  socket.on('shop_upgrade_result',    (data) => Shop.onUpgradeResult(data));
  socket.on('use_card_result', (data) => Game.onUseCardResult(data));
  socket.on('hand_update',     (data) => { Game.onHandUpdate(data); Shop.onHandUpdate(data); });
  socket.on('card_effect',     (data) => Game.onCardEffect(data));
  socket.on('match_end',     (data) => { Result.onMatchEnd(data); showScreen('screen-result'); });
}

// ── Firebase Auth ─────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const idToken = await user.getIdToken();
    connectSocket(idToken);
  } else {
    showScreen('screen-login');
  }
});

document.getElementById('btn-google-login').addEventListener('click', () => {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
});

// ── 각 화면 모듈 초기화 ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Lobby.init(() => socket);
  Game.init(() => socket);
  Shop.init(() => socket);
  Result.init(() => socket);
});