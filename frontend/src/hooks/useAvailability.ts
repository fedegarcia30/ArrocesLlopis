import { useState, useEffect, useCallback } from 'react';
import { checkAvailability } from '../api/availability';
import type { Slot } from '../types';
import { useAuth } from './useAuth';

export function useAvailability(date: string) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!user) return; // Wait until authenticated
    setLoading(true);
    setError(null);
    try {
      const response = await checkAvailability(date);
      setSlots(response.slots);
    } catch {
      // Backend no disponible — estado vacío sin error visible
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [date, user]);

  useEffect(() => {
    if (date && user) {
      load();
    }
  }, [date, user, load]);

  return { slots, loading, error, reload: load };
}
