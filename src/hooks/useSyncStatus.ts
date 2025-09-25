import { useState, useEffect } from 'react';
import { syncService } from '../services/SyncService';

interface SyncStatus {
  status: 'idle' | 'syncing' | 'error';
  queueStatus: {
    pending: number;
    total: number;
  };
  forceSync: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [queueStatus, setQueueStatus] = useState({ pending: 0, total: 0 });

  useEffect(() => {
    // Monitora status de sincronização
    const removeSyncListener = syncService.addListener((newStatus) => {
      setStatus(newStatus);
    });

    // Atualiza status da fila periodicamente
    const updateQueueStatus = async () => {
      const status = await syncService.getQueueStatus();
      setQueueStatus(status);
    };

    updateQueueStatus();
    const queueInterval = setInterval(updateQueueStatus, 5000);

    return () => {
      removeSyncListener();
      clearInterval(queueInterval);
    };
  }, []);

  const forceSync = async () => {
    try {
      await syncService.forceSync();
    } catch (error) {
      console.error('Erro ao forçar sincronização:', error);
    }
  };

  const clearQueue = async () => {
    try {
      await syncService.clearQueue();
      setQueueStatus({ pending: 0, total: 0 });
    } catch (error) {
      console.error('Erro ao limpar fila:', error);
    }
  };

  return {
    status,
    queueStatus,
    forceSync,
    clearQueue
  };
}
