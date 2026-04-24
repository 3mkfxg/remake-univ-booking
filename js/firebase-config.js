/* ============================================================
   Firebase Configuration — LIVE
   Project: new-booking-web
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBY28h9drHFODxseReykewjaMXry2dvSGs",
  authDomain: "new-booking-web.firebaseapp.com",
  projectId: "new-booking-web",
  storageBucket: "new-booking-web.firebasestorage.app",
  messagingSenderId: "24379915800",
  appId: "1:24379915800:web:a34da638c4a421643ccd6d",
  measurementId: "G-YBMF6TYNF7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();

// Auth reference
const auth = firebase.auth();

// ── Collection References ──
const Collections = {
  USERS: 'users',
  BOOKINGS: 'bookings',
  FIELDS: 'fields',
  EMAIL_LOGS: 'emailLogs',
  SETTINGS: 'settings'
};

// ── Helper: Check if Firebase is configured ──
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE';
}

console.log('✅ Firebase connected — Project: new-booking-web');
