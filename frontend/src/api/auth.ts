import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

// Solución al problema del 401 por carga asíncrona de Firebase
export async function getCurrentToken(): Promise<string | null> {
  const user: any = await new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      unsubscribe();
      resolve(currentUser);
    }, reject);
  });

  if (!user) return null;
  return user.getIdToken();
}

export async function getUserProfile() {
  const token = await getCurrentToken();
  if (!token) return null;

  // Usa la variable de entorno configurada (VITE_API_BASE_URL)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  return response.json();
}
