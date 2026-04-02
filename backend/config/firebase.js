const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let db;

function loadServiceAccount() {
  const serviceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : "";

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    return require(serviceAccountPath);
  }

  throw new Error(
    "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON for Vercel or FIREBASE_SERVICE_ACCOUNT_PATH for local development."
  );
}

function initializeFirebase() {
  if (admin.apps.length) {
    db = admin.firestore();
    return { admin, db };
  }

  // Admin SDK lets the server manage Firebase Auth and Firestore safely.
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });

  db = admin.firestore();
  return { admin, db };
}

module.exports = { initializeFirebase };
