import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Incident ids the signed-in citizen has already reverified, so "Verify" actions can be hidden.
export const useReverifiedIds = (): number[] => {
  const { user } = useAuth();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (user?.role !== 'citizen') return;
    api.getMyReverifiedIds().then(setIds).catch(() => setIds([]));
  }, [user]);

  return ids;
};
