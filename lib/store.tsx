import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from './firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from './firebase';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { firebaseConfigured } from './config';
import { demoExplain, explainLetter, SAMPLE_LETTERS, soonestDue, urgencyFor } from './explain';
import { signInWithGoogle } from './google';
import type { HistoryEntry, Letter, LetterCategory } from './types';

const LETTERS_KEY = 'civichellper:letters:v1';
const HISTORY_KEY = 'civichellper:history:v1';
const SEEDED_KEY = 'civichellper:seeded:v1';
const HISTORY_LIMIT = 20;

export interface AuthUser {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  /** 'google.com' or 'password' — how this account signs in. */
  provider: string | null;
}

export interface DeadlineItem {
  letterId: string;
  letterTitle: string;
  sender: string;
  stepId: string;
  text: string;
  deadline: string;
}

export interface AppState {
  letters: Letter[];
  history: HistoryEntry[];
  /** Upcoming undone action steps with deadlines, soonest first. */
  deadlines: DeadlineItem[];
  lettersExplained: number;
  deadlinesThisWeek: number;
  stepsDone: number;
  user: AuthUser | null;
  authReady: boolean;
  guest: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  setAvatarData: (dataUrl: string) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  addLetter: (input: {
    text: string;
    sender: string;
    title: string;
    category: LetterCategory;
  }) => Promise<Letter>;
  toggleStep: (letterId: string, stepId: string) => void;
  markLetterDone: (letterId: string) => void;
  deleteLetter: (letterId: string) => void;
  applyHistory: (entry: HistoryEntry) => Letter | null;
  clearHistory: () => void;
  clearDemoData: () => void;
  letterById: (id: string) => Letter | undefined;
  urgencyOf: (letter: Letter) => ReturnType<typeof urgencyFor>;
}

const AppContext = createContext<AppState | null>(null);

function loadJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** First-run demo content so the inbox is alive immediately. */
function seedDemo(): { letters: Letter[]; history: HistoryEntry[] } {
  const now = Date.now();
  const day = 86400000;
  const letters: Letter[] = SAMPLE_LETTERS.map((sample, i) => {
    const explanation = demoExplain(sample.text, sample.sender, sample.title);
    const due = soonestDue(explanation);
    return {
      id: `demo-${sample.id}`,
      sender: sample.sender,
      title: sample.title,
      category: sample.category,
      originalText: sample.text,
      receivedAt: now - (3 - i) * day,
      dueDate: due,
      explanation,
      done: false,
      isDemo: true,
    };
  });
  const history: HistoryEntry[] = letters.map((l) => ({
    id: `h-${l.id}`,
    letterId: l.id,
    title: l.title,
    sender: l.sender,
    at: l.receivedAt,
  }));
  return { letters, history };
}

async function upsertProfile(u: User): Promise<void> {
  if (!firebaseConfigured) return;
  try {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    const base = {
      displayName: u.displayName ?? '',
      email: u.email ?? '',
      photoURL: u.photoURL ?? '',
      lastLoginAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    } else {
      await setDoc(ref, base, { merge: true });
    }
  } catch {
    // Sync is best-effort; the app keeps working offline.
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const lettersRef = useRef<Letter[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyLoadedRef = useRef(false);
  const unsubsRef = useRef<(() => void)[]>([]);
  // Snapshot of "now" for the this-week count — a stable value for the
  // render, not a fresh clock read on every render.
  const [bootTime] = useState(() => Date.now());

  // Local data loads once at startup; first launch seeds the demo letters.
  useEffect(() => {
    void (async () => {
      const [lRaw, hRaw, seeded] = await Promise.all([
        AsyncStorage.getItem(LETTERS_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(SEEDED_KEY),
      ]);
      const l = loadJson<Letter[]>(lRaw);
      const h = loadJson<HistoryEntry[]>(hRaw);
      if (l && l.length > 0) {
        setLetters(l);
        setHistory(h ?? []);
      } else if (!seeded) {
        const demo = seedDemo();
        setLetters(demo.letters);
        setHistory(demo.history);
        await AsyncStorage.setItem(SEEDED_KEY, '1');
      }
      historyLoadedRef.current = true;
    })();
  }, []);

  // Local mirrors.
  useEffect(() => {
    lettersRef.current = letters;
    AsyncStorage.setItem(LETTERS_KEY, JSON.stringify(letters)).catch(() => undefined);
  }, [letters]);
  useEffect(() => {
    historyRef.current = history;
    if (!historyLoadedRef.current) return;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => undefined);
  }, [history]);

  // Auth state: profile write, cloud subscriptions.
  // Readiness waits for Firebase to finish restoring any persisted
  // session from storage — the gate must not decide "signed out" (and
  // show Welcome) before the saved session has had its chance to load.
  useEffect(() => {
    let alive = true;
    void auth.authStateReady().then(() => {
      if (alive) setAuthReady(true);
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      for (const fn of unsubsRef.current) fn();
      unsubsRef.current = [];
      if (!u) {
        setUser(null);
        return;
      }
      setUser({
        uid: u.uid,
        name: u.displayName,
        email: u.email,
        photo: u.photoURL,
        provider: u.providerData[0]?.providerId ?? null,
      });
      void upsertProfile(u);
      if (!firebaseConfigured) return;

      const subscribe = <T,>(
        colName: string,
        apply: (items: T[]) => void,
        local: () => T[],
        idOf: (item: T) => string,
      ) => {
        const col = collection(db, 'users', u.uid, colName);
        unsubsRef.current.push(
          onSnapshot(
            col,
            (snap) => {
              apply(snap.docs.map((d) => d.data() as T));
            },
            () => undefined,
          ),
        );
        // One-time merge: anything saved locally before sign-in joins the account.
        void (async () => {
          try {
            const cloud = await getDocs(col);
            const cloudIds = new Set(cloud.docs.map((d) => d.id));
            for (const item of local()) {
              const id = idOf(item);
              if (!cloudIds.has(id)) {
                await setDoc(
                  doc(db, 'users', u.uid, colName, id),
                  item as unknown as Record<string, unknown>,
                );
              }
            }
          } catch {
            // Best-effort merge only.
          }
        })();
      };
      subscribe<Letter>('letters', setLetters, () => lettersRef.current, (l) => l.id);
      subscribe<HistoryEntry>('history', setHistory, () => historyRef.current, (h) => h.id);

      // Profile doc: a custom avatar / edited name stored there overrides
      // the auth copy.
      void (async () => {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUser((prev) =>
              prev && prev.uid === u.uid
                ? {
                    ...prev,
                    name: (data.displayName as string) || prev.name,
                    photo: (data.photoData as string) || prev.photo,
                  }
                : prev,
            );
          }
        } catch {
          // Keep the auth profile.
        }
      })();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const deadlines = useMemo<DeadlineItem[]>(() => {
    const items: DeadlineItem[] = [];
    for (const letter of letters) {
      if (!letter.explanation) continue;
      for (const step of letter.explanation.steps) {
        if (step.done || !step.deadline) continue;
        items.push({
          letterId: letter.id,
          letterTitle: letter.title,
          sender: letter.sender,
          stepId: step.id,
          text: step.text,
          deadline: step.deadline,
        });
      }
    }
    return items.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [letters]);

  const lettersExplained = useMemo(
    () => letters.filter((l) => l.explanation).length,
    [letters],
  );

  const deadlinesThisWeek = useMemo(() => {
    const now = bootTime;
    const week = now + 7 * 86400000;
    return deadlines.filter((d) => {
      const t = new Date(`${d.deadline}T12:00:00`).getTime();
      return t >= now - 86400000 && t <= week;
    }).length;
  }, [deadlines, bootTime]);

  const stepsDone = useMemo(
    () =>
      letters.reduce(
        (n, l) => n + (l.explanation?.steps.filter((s) => s.done).length ?? 0),
        0,
      ),
    [letters],
  );

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanName = name.trim();
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
        setUser({
          uid: cred.user.uid,
          name: cleanName,
          email: cred.user.email,
          photo: null,
          provider: 'password',
        });
        void upsertProfile({ ...cred.user, displayName: cleanName } as User);
      }
    },
    [],
  );

  const updateDisplayName = useCallback(async (name: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const clean = name.trim();
    await updateProfile(currentUser, { displayName: clean });
    if (firebaseConfigured) {
      await setDoc(doc(db, 'users', currentUser.uid), { displayName: clean }, { merge: true });
    }
    setUser((prev) => (prev ? { ...prev, name: clean } : prev));
  }, []);

  const setAvatarData = useCallback(async (dataUrl: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (firebaseConfigured) {
      await setDoc(doc(db, 'users', currentUser.uid), { photoData: dataUrl }, { merge: true });
    }
    setUser((prev) => (prev ? { ...prev, photo: dataUrl } : prev));
  }, []);

  const sendPasswordReset = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;
    await sendPasswordResetEmail(auth, currentUser.email);
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    // Back to the welcome screen — the gate routes there as soon as the
    // user is signed out and not a guest.
    setGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    // Deliberately NOT persisted: guest lasts for this visit only, so the
    // next open asks for sign-in again. A signed-in user, by contrast,
    // stays signed in (Firebase Auth persistence).
    setGuest(true);
  }, []);

  const syncDoc = useCallback(
    (colName: string, id: string, data: unknown) => {
      if (!user || !firebaseConfigured) return;
      void setDoc(doc(db, 'users', user.uid, colName, id), data).catch(() => undefined);
    },
    [user],
  );

  const deleteDocCloud = useCallback(
    (colName: string, id: string) => {
      if (!user || !firebaseConfigured) return;
      void deleteDoc(doc(db, 'users', user.uid, colName, id)).catch(() => undefined);
    },
    [user],
  );

  const addLetter = useCallback(
    async (input: {
      text: string;
      sender: string;
      title: string;
      category: LetterCategory;
    }): Promise<Letter> => {
      const explanation = await explainLetter(input.text, input.sender, input.title);
      const letter: Letter = {
        id: uid('l'),
        sender: input.sender.trim() || 'Unknown sender',
        title: input.title.trim() || 'Official letter',
        category: input.category,
        originalText: input.text,
        receivedAt: Date.now(),
        dueDate: soonestDue(explanation),
        explanation,
        done: false,
      };
      setLetters((prev) => [letter, ...prev]);
      syncDoc('letters', letter.id, letter);
      const entry: HistoryEntry = {
        id: uid('h'),
        letterId: letter.id,
        title: letter.title,
        sender: letter.sender,
        at: letter.receivedAt,
      };
      setHistory((prev) =>
        prev.some((h) => h.letterId === letter.id)
          ? prev
          : [entry, ...prev].slice(0, HISTORY_LIMIT),
      );
      syncDoc('history', entry.id, entry);
      return letter;
    },
    [syncDoc],
  );

  const toggleStep = useCallback(
    (letterId: string, stepId: string) => {
      let updated: Letter | null = null;
      setLetters((prev) =>
        prev.map((l) => {
          if (l.id !== letterId || !l.explanation) return l;
          const steps = l.explanation.steps.map((s) =>
            s.id === stepId ? { ...s, done: !s.done } : s,
          );
          const done = steps.length > 0 && steps.every((s) => s.done);
          updated = { ...l, explanation: { ...l.explanation, steps }, done };
          return updated;
        }),
      );
      if (updated) syncDoc('letters', letterId, updated);
    },
    [syncDoc],
  );

  const markLetterDone = useCallback(
    (letterId: string) => {
      let updated: Letter | null = null;
      setLetters((prev) =>
        prev.map((l) => {
          if (l.id !== letterId) return l;
          const steps = l.explanation
            ? l.explanation.steps.map((s) => ({ ...s, done: true }))
            : [];
          updated = {
            ...l,
            done: true,
            explanation: l.explanation ? { ...l.explanation, steps } : null,
          };
          return updated;
        }),
      );
      if (updated) syncDoc('letters', letterId, updated);
    },
    [syncDoc],
  );

  const deleteLetter = useCallback(
    (letterId: string) => {
      setLetters((prev) => prev.filter((l) => l.id !== letterId));
      setHistory((prev) => prev.filter((h) => h.letterId !== letterId));
      deleteDocCloud('letters', letterId);
    },
    [deleteDocCloud],
  );

  const applyHistory = useCallback(
    (entry: HistoryEntry): Letter | null => {
      return lettersRef.current.find((l) => l.id === entry.letterId) ?? null;
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (user && firebaseConfigured) {
      void (async () => {
        try {
          const snap = await getDocs(collection(db, 'users', user.uid, 'history'));
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        } catch {
          // The subscription will reconcile the visible list.
        }
      })();
    }
  }, [user]);

  const clearDemoData = useCallback(() => {
    const demoIds = new Set(lettersRef.current.filter((l) => l.isDemo).map((l) => l.id));
    setLetters((prev) => prev.filter((l) => !l.isDemo));
    setHistory((prev) => prev.filter((h) => !demoIds.has(h.letterId)));
    if (user && firebaseConfigured) {
      for (const id of demoIds) {
        void deleteDoc(doc(db, 'users', user.uid, 'letters', id)).catch(() => undefined);
      }
    }
  }, [user]);

  const letterById = useCallback(
    (id: string) => letters.find((l) => l.id === id),
    [letters],
  );

  const urgencyOf = useCallback(
    (letter: Letter) => urgencyFor(letter.dueDate),
    [],
  );

  const value = useMemo<AppState>(
    () => ({
      letters,
      history,
      deadlines,
      lettersExplained,
      deadlinesThisWeek,
      stepsDone,
      user,
      authReady,
      guest,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      updateDisplayName,
      setAvatarData,
      sendPasswordReset,
      resetPasswordForEmail,
      signOut,
      continueAsGuest,
      addLetter,
      toggleStep,
      markLetterDone,
      deleteLetter,
      applyHistory,
      clearHistory,
      clearDemoData,
      letterById,
      urgencyOf,
    }),
    [
      letters,
      history,
      deadlines,
      lettersExplained,
      deadlinesThisWeek,
      stepsDone,
      user,
      authReady,
      guest,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      updateDisplayName,
      setAvatarData,
      sendPasswordReset,
      resetPasswordForEmail,
      signOut,
      continueAsGuest,
      addLetter,
      toggleStep,
      markLetterDone,
      deleteLetter,
      applyHistory,
      clearHistory,
      clearDemoData,
      letterById,
      urgencyOf,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
