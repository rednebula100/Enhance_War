const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function verifyToken(idToken) {
  return admin.auth().verifyIdToken(idToken);
}

async function getPlayerData(uid) {
  const doc = await db.collection('players').doc(uid).get();
  return doc.exists ? doc.data() : { money: 0, bestRound: 0 };
}

async function updateMatchResult(uid, { won, rounds }) {
  const ref = db.collection('players').doc(uid);
  const data = await getPlayerData(uid);
  await ref.set({
    money: data.money + (won ? 1000 : 0),
    bestRound: Math.max(data.bestRound || 0, rounds),
  }, { merge: true });
}

module.exports = { verifyToken, getPlayerData, updateMatchResult };