import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase wiring for CivicHelper — web.
 *
 * No Firebase project exists yet (2026-11-18) — the values below are
 * TODO placeholders for the publish step: create a clearly-named
 * "CivicHelper" project under aryanch99999@gmail.com, enable
 * Email/Password + Google sign-in (email-link OFF), add the app's
 * Vercel domain to authorized domains, then paste the real web config
 * here and in firebase.native.ts and flip `firebaseConfigured` to true
 * in lib/config.ts. Until then the app runs in full local/guest mode.
 *
 * The config values are Firebase's public app identifiers — they are
 * designed to ship in client code. Access is controlled by Firebase
 * Authentication plus the Firestore security rules (each user can only
 * read and write their own /users/<uid> tree). No admin keys or secrets
 * live here; the Gemini key stays server-side in the /api/explain
 * function.
 *
 * Platform note: this file serves web (and tooling). Native builds use
 * firebase.native.ts instead, which imports the scoped @firebase/*
 * packages — the umbrella 'firebase/auth' entry has no React Native
 * build, so on Android/iOS it silently resolves to the browser build
 * whose sessions live in memory only and are lost when the app closes.
 * Every module imports its Auth/Firestore helpers from './firebase' so
 * each platform always gets one consistent set of Firebase modules.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyChF74aEhlGUfQWyaasXxifasIdBtm1jBE',
  authDomain: 'civichellper.firebaseapp.com',
  projectId: 'civichellper',
  storageBucket: 'civichellper.firebasestorage.app',
  messagingSenderId: '128766534259',
  appId: '1:128766534259:web:d08284ef2f74e1ed71c006',
};

/** OAuth web client ID for the native Google Sign-In flow (not a secret). */
export const GOOGLE_WEB_CLIENT_ID = '128766534259-9jpio0stcl3hkqpa5d6si9mk8vplfftq.apps.googleusercontent.com';

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = firebaseAuth.getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  type User,
} from 'firebase/auth';

export {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
