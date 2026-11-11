import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
// Request offline/prompt if needed so token refresh can be handled
provider.setCustomParameters({
  prompt: 'select_account'
});

const GOOGLE_TOKEN_STORAGE_KEY = 'refumo_google_access_token_v1';
const GOOGLE_TOKEN_EXP_KEY = 'refumo_google_access_token_exp_v1';

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const token = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    const expStr = localStorage.getItem(GOOGLE_TOKEN_EXP_KEY);
    if (token && expStr) {
      const exp = Number(expStr);
      // Valid if it hasn't expired (leave 60s margin)
      if (Date.now() < exp - 60000) {
        cachedAccessToken = token;
        return token;
      } else {
        localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
        localStorage.removeItem(GOOGLE_TOKEN_EXP_KEY);
      }
    }
  } catch {
    // ignore
  }
  return null;
};

export const setAccessToken = (token: string | null, expiresInSeconds = 3500) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(GOOGLE_TOKEN_EXP_KEY, String(Date.now() + expiresInSeconds * 1000));
    } else {
      localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_TOKEN_EXP_KEY);
    }
  } catch {
    // ignore
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      setAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an access token for Sheets. Please approve the permissions.');
    }
    setAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await signOut(auth);
  setAccessToken(null);
};
