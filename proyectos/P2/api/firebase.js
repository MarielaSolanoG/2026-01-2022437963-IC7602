const admin = require("firebase-admin");

// En producción las credenciales vienen de variables de entorno
// En local vienen del archivo firebase-key.json
let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
} else {
    const serviceAccount = require("./firebase-key.json");
    credential = admin.credential.cert(serviceAccount);
}

if (!admin.apps.length) {
    admin.initializeApp({ credential });
}

const db = admin.firestore();

module.exports = db;