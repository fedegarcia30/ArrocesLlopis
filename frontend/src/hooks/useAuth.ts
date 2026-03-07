import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { signIn as apiSignIn, signOut as apiSignOut, getUserProfile } from '../api/auth';
import type { AuthUser } from '../types';
import React from 'react';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        setUser(prev => prev ? { ...prev, ...profile } : profile);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Initial state from Firebase
        const baseUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };
        setUser(baseUser);

        // Fetch extended profile (role) from SQL
        try {
          const profile = await getUserProfile();
          if (profile) {
            setUser({ ...baseUser, ...profile });
          }
        } catch (err) {
          console.error("Failed to fetch user role from SQL:", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await apiSignIn(email, password);
    // Profile sync happens in onAuthStateChanged
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, signIn, signOut, refreshProfile } },
    children
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
