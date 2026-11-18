/**
 * CivicHelper runtime config.
 *
 * The letter explainer is a Python serverless function that lives at
 * /api/explain on the same origin as the deployed web app (Vercel).
 * EXPO_PUBLIC_API_URL overrides the origin for native builds or local
 * development (e.g. the deployed Vercel URL). When no endpoint answers,
 * the app falls back to its on-device demo explainer (lib/explain.ts)
 * and says so honestly — the letter itself is always saved and readable.
 *
 * No Gemini key ever lives in this file or in app code; the key is
 * server-side only in the /api/explain function.
 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

/**
 * Set to true once the Firebase project for CivicHelper exists and the
 * values in lib/firebase.ts / lib/firebase.native.ts are the real web
 * config. No project exists yet (2026-11-18) — wiring is a publish
 * step; until then the app runs in full local/guest mode.
 */
export const firebaseConfigured = false;
