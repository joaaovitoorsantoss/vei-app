import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { VistoriaData } from '../context/VistoriaContext';
import { API_URL } from '@env';

const SYNC_QUEUE_KEY = '@sync_queue';
const SYNC_PROCESSING_KEY = '@sync_processing'; // Chave para controlar IDs sendo processados globalmente
const SYNC_ATTEMPTS_KEY = '@sync_attempts'; // Chave para rastrear tentativas específicas
const SYNC_INTERVAL = 30000; // 30 segundos
const MAX_RETRY_ATTEMPTS = 3;

interface SyncItem {
  id: string;
  data: VistoriaData;
  attempts: number;
  lastAttempt: number;
  createdAt: number;
}

interface ProcessingRecord {
  id: string;
  timestamp: number;
}

interface SyncAttempt {
  itemId: string;
  attemptId: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface SyncCallbacks {
  onSyncStart?: () => void;
  onSyncSuccess?: (itemId: string, data: VistoriaData) => void;
  onSyncError?: (itemId: string, error: Error, attempts: number) => void;
  onSyncComplete?: (success: boolean, totalProcessed: number) => void;
  onQueueEmpty?: () => void;
}

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;
  private processingSyncIds = new Set<string>(); // IDs sendo processados no momento
  private currentAttemptId: string | null = null; // ID da tentativa atual
  private listeners: Array<(status: 'syncing' | 'idle' | 'error') => void> = [];
  private syncCallbacks: SyncCallbacks = {};

  constructor() {
    this.startNetworkMonitoring();
    // Limpa IDs órfãos ao iniciar
    this.cleanupOrphanedProcessingIds();
  }

  // Adiciona listener para status de sincronização
  addListener(callback: (status: 'syncing' | 'idle' | 'error') => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Configura callbacks específicos para eventos de sincronização
  setSyncCallbacks(callbacks: SyncCallbacks) {
    this.syncCallbacks = { ...this.syncCallbacks, ...callbacks };
  }

  // Remove callbacks de sincronização
  clearSyncCallbacks() {
    this.syncCallbacks = {};
  }

  // Método específico para step7 configurar callbacks
  configureForStep7(callbacks: {
    onStart?: () => void;
    onSuccess?: (message?: string) => void;
    onError?: (error: string, canRetry?: boolean) => void;
    onComplete?: () => void;
  }) {
    this.setSyncCallbacks({
      onSyncStart: callbacks.onStart,
      onSyncSuccess: (itemId, data) => {
        callbacks.onSuccess?.(`Vistoria ${data.nome} sincronizada com sucesso!`);
      },
      onSyncError: (itemId, error, attempts) => {
        const canRetry = attempts < MAX_RETRY_ATTEMPTS;
        callbacks.onError?.(
          `Erro ao sincronizar: ${error.message}`,
          canRetry
        );
      },
      onSyncComplete: (success, totalProcessed) => {
        callbacks.onComplete?.();
      },
      onQueueEmpty: callbacks.onComplete
    });
  }

  // Notifica todos os listeners sobre mudança de status
  private notifyListeners(status: 'syncing' | 'idle' | 'error') {
    this.listeners.forEach(listener => listener(status));
  }

  // Inicia o monitoramento de rede
  private startNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable && !this.isRunning) {
        console.log('Rede detectada, iniciando sincronização...');
        this.startSync();
      } else if (!state.isConnected && this.isRunning) {
        console.log('Rede perdida, parando sincronização...');
        this.stopSync();
      }
    });
  }

  // Adiciona item à fila de sincronização
  async addToQueue(vistoriaData: VistoriaData): Promise<string> {
    try {
      const syncItem: SyncItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: vistoriaData,
        attempts: 0,
        lastAttempt: 0,
        createdAt: Date.now()
      };

      const queue = await this.getQueue();
      queue.push(syncItem);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

      console.log('Item adicionado à fila de sincronização:', syncItem.id);
      
      // Inicia sincronização se houver rede
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && netInfo.isInternetReachable) {
        this.startSync();
      }

      return syncItem.id;
    } catch (error) {
      console.error('Erro ao adicionar item à fila:', error);
      throw error;
    }
  }

  // Obtém a fila de sincronização
  private async getQueue(): Promise<SyncItem[]> {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Erro ao obter fila de sincronização:', error);
      return [];
    }
  }

  // Salva a fila de sincronização
  private async saveQueue(queue: SyncItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Erro ao salvar fila de sincronização:', error);
    }
  }

  // Remove item da fila
  private async removeFromQueue(itemId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.id !== itemId);
      await this.saveQueue(filteredQueue);
      console.log('Item removido da fila:', itemId);
    } catch (error) {
      console.error('Erro ao remover item da fila:', error);
    }
  }

  // Inicia o processo de sincronização
  startSync() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.notifyListeners('syncing');
    
    // Chama callback de início se configurado
    this.syncCallbacks.onSyncStart?.();

    this.syncInterval = setInterval(async () => {
      await this.processQueue();
    }, SYNC_INTERVAL);

    // Processa imediatamente
    this.processQueue();
  }

  // Para o processo de sincronização
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    // Limpa IDs de processamento ao parar (local e global)
    this.processingSyncIds.clear();
    this.cleanupOrphanedProcessingIds(); // Limpa IDs globais também
    this.notifyListeners('idle');
  }

  // Processa a fila de sincronização
  private async processQueue() {
    // Evita processamento simultâneo
    if (this.isProcessing) {
      console.log('Processamento já em andamento, ignorando...');
      return;
    }

    this.isProcessing = true;
    
    try {
      // Limpa tentativas expiradas primeiro
      await this.cleanupExpiredAttempts();
      
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.stopSync();
        this.syncCallbacks.onQueueEmpty?.();
        return;
      }
      // const item = queue[0]

      console.log(`Processando ${queue.length} itens na fila de sincronização...`);
      
      let processedCount = 0;
      let hasErrors = false;

      for (const item of queue) {
        // Verifica se este item já está sendo processado localmente
        if (this.processingSyncIds.has(item.id)) {
          console.log(`Item ${item.id} já está sendo processado localmente, ignorando...`);
          continue;
        }

        // Verifica se não excedeu o número máximo de tentativas
        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          console.log(`Item ${item.id} excedeu máximo de tentativas, removendo da fila`);
          await this.removeFromQueue(item.id);
          this.syncCallbacks.onSyncError?.(
            item.id, 
            new Error('Máximo de tentativas excedido'), 
            item.attempts
          );
          hasErrors = true;
          processedCount++;
          continue;
        }

        // Verifica se passou tempo suficiente desde a última tentativa
        const timeSinceLastAttempt = Date.now() - item.lastAttempt;
        if (timeSinceLastAttempt < 10000) { // 10 segundos
          continue;
        }

        // Cria uma nova tentativa única para este item
        const attemptId = await this.createSyncAttempt(item.id);
        if (!attemptId) {
          console.log(`Item ${item.id} já possui tentativa ativa, ignorando...`);
          continue;
        }

        // Tenta adicionar ao processamento global (controle entre instâncias)
        const canProcess = await this.addToGlobalProcessing(item.id);
        if (!canProcess) {
          console.log(`Item ${item.id} já está sendo processado globalmente, removendo tentativa...`);
          await this.removeSyncAttempt(attemptId);
          continue;
        }

        // Marca o ID como sendo processado localmente também
        this.processingSyncIds.add(item.id);
        this.currentAttemptId = attemptId;
        
        // Atualiza status da tentativa para 'processing'
        await this.updateSyncAttemptStatus(attemptId, 'processing');
        
        console.log(`Iniciando processamento do item ${item.id} com tentativa ${attemptId}...`);

        try {
          await this.syncItem(item);
          await this.removeFromQueue(item.id);
          
          // Marca tentativa como concluída
          await this.updateSyncAttemptStatus(attemptId, 'completed');
          
          console.log(`Item ${item.id} sincronizado com sucesso`);
          
          // Chama callback de sucesso
          this.syncCallbacks.onSyncSuccess?.(item.id, item.data);
          processedCount++;
          
        } catch (error) {
          console.error(`Erro ao sincronizar item ${item.id}:`, error);
          
          // Marca tentativa como falhada
          await this.updateSyncAttemptStatus(attemptId, 'failed');
          
          // Atualiza tentativas
          item.attempts += 1;
          item.lastAttempt = Date.now();
          
          const updatedQueue = await this.getQueue();
          const itemIndex = updatedQueue.findIndex(q => q.id === item.id);
          if (itemIndex !== -1) {
            updatedQueue[itemIndex] = item;
            await this.saveQueue(updatedQueue);
          }
          
          // Chama callback de erro
          this.syncCallbacks.onSyncError?.(item.id, error as Error, item.attempts);
          hasErrors = true;
          processedCount++;
        } finally {
          // Remove o ID da lista de processamento local e global
          this.processingSyncIds.delete(item.id);
          await this.removeFromGlobalProcessing(item.id);
          
          // Remove a tentativa se não foi marcada como concluída
          const attempt = await this.getAllSyncAttempts();
          const currentAttempt = attempt.find(a => a.attemptId === attemptId);
          if (currentAttempt && currentAttempt.status !== 'completed') {
            await this.removeSyncAttempt(attemptId);
          }
          
          this.currentAttemptId = null;
          console.log(`Finalizou processamento do item ${item.id} com tentativa ${attemptId}`);
        }
      }
      
      // Chama callback de conclusão se processou algum item
      if (processedCount > 0) {
        this.syncCallbacks.onSyncComplete?.(!hasErrors, processedCount);
      }
      
    } catch (error) {
      console.error('Erro ao processar fila de sincronização:', error);
      this.notifyListeners('error');
      this.syncCallbacks.onSyncError?.('queue', error as Error, 0);
    } finally {
      this.isProcessing = false;
    }
  }

  // Sincroniza um item específico
  private async syncItem(item: SyncItem): Promise<void> {
    // const { API_URL } = require('@env');
    const apiURL = API_URL;
    
    try {
      // 1. Upload das imagens
      const uploadedUrls = await this.uploadImages(item.data);
      
      // 2. Atualiza as URLs das imagens
      const updatedData = this.updateImageUrls(item.data, uploadedUrls);
      
      // 3. Envia os dados para a API
      await this.sendVistoriaData(updatedData);
      
      console.log(`Item ${item.id} sincronizado com sucesso`);
    } catch (error) {
      console.error(`Erro ao sincronizar item ${item.id}:`, error);
      throw error;
    }
  }

  // Upload das imagens
  private async uploadImages(vistoriaData: VistoriaData): Promise<{ [key: string]: string }> {
    const apiURL = API_URL;
    
    const imagesToUpload: { uri: string; type: string; name: string }[] = [];

    // Adiciona fotos principais
    Object.entries(vistoriaData.fotos).forEach(([key, photo]) => {
      if (photo && photo.startsWith('file://')) {
        imagesToUpload.push({
          uri: photo,
          type: 'image/jpeg',
          name: `main_${key}.jpg`
        });
      }
    });

    // Adiciona fotos de observações
    vistoriaData.observacoes.forEach((obs, index) => {
      if (obs.foto && obs.foto.startsWith('file://')) {
        imagesToUpload.push({
          uri: obs.foto,
          type: 'image/jpeg',
          name: `observation_${index}.jpg`
        });
      }
    });

    if (imagesToUpload.length === 0) {
      return {};
    }

    const formData = new FormData();
    
    if (vistoriaData.id) {
      formData.append('id_vistoria', vistoriaData.id.toString());
    }

    imagesToUpload.forEach(image => {
      formData.append('fotos[]', image as any);
    });

    const response = await fetch(`${apiURL}/upload-batch`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.erro || `Erro ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.urls || {};
  }

  // Atualiza URLs das imagens
  private updateImageUrls(vistoriaData: VistoriaData, uploadedUrls: { [key: string]: string }): VistoriaData {
    const updatedData = { ...vistoriaData };

    // Atualiza fotos principais
    Object.entries(updatedData.fotos).forEach(([key, photo]) => {
      if (photo && photo.startsWith('file://')) {
        const newUrl = uploadedUrls[`main_${key}`] || photo;
        updatedData.fotos[key as keyof typeof updatedData.fotos] = newUrl;
      }
    });

    // Atualiza fotos de observações
    updatedData.observacoes = updatedData.observacoes.map((obs, index) => {
      if (obs.foto && obs.foto.startsWith('file://')) {
        const newUrl = uploadedUrls[`observation_${index}`] || obs.foto;
        return { ...obs, foto: newUrl };
      }
      return obs;
    });

    return updatedData;
  }

  // Envia dados da vistoria para a API
  private async sendVistoriaData(vistoriaData: VistoriaData): Promise<void> {
    const apiURL = API_URL;

    const response = await fetch(`${apiURL}/vistorias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dados: {
          nome: vistoriaData.nome,
          frota: vistoriaData.frota,
          quilometragem: vistoriaData.quilometragem,
          checklist: vistoriaData.checklist,
          avaliacoes: vistoriaData.avaliacoes,
          estado_tecnico: vistoriaData.estado_tecnico,
          fotos: vistoriaData.fotos,
          observacoes: vistoriaData.observacoes
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao enviar dados: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.id) {
      // Atualiza o ID da vistoria se retornado
      vistoriaData.id = result.id;
    }
  }

  // Obtém status da fila
  async getQueueStatus(): Promise<{ pending: number; total: number }> {
    try {
      const queue = await this.getQueue();
      return {
        pending: queue.length,
        total: queue.length
      };
    } catch (error) {
      console.error('Erro ao obter status da fila:', error);
      return { pending: 0, total: 0 };
    }
  }

  // Limpa a fila de sincronização
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      await AsyncStorage.removeItem(SYNC_PROCESSING_KEY);
      await AsyncStorage.removeItem(SYNC_ATTEMPTS_KEY);
      // Limpa também IDs de processamento local
      this.processingSyncIds.clear();
      this.currentAttemptId = null;
      console.log('Fila de sincronização e IDs de processamento limpos');
    } catch (error) {
      console.error('Erro ao limpar fila de sincronização:', error);
    }
  }

  // Cria uma nova tentativa de sincronização única
  private async createSyncAttempt(itemId: string): Promise<string | null> {
    try {
      const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Verifica se já existe uma tentativa ativa para este item
      const existingAttempt = await this.getActiveSyncAttempt(itemId);
      if (existingAttempt) {
        console.log(`Item ${itemId} já possui tentativa ativa: ${existingAttempt.attemptId}`);
        return null;
      }

      const newAttempt: SyncAttempt = {
        itemId,
        attemptId,
        timestamp: Date.now(),
        status: 'pending'
      };

      await this.saveSyncAttempt(newAttempt);
      console.log(`Nova tentativa criada: ${attemptId} para item ${itemId}`);
      return attemptId;
    } catch (error) {
      console.error('Erro ao criar tentativa de sincronização:', error);
      return null;
    }
  }

  // Obtém tentativa ativa para um item específico
  private async getActiveSyncAttempt(itemId: string): Promise<SyncAttempt | null> {
    try {
      const attempts = await this.getAllSyncAttempts();
      const activeAttempt = attempts.find(attempt => 
        attempt.itemId === itemId && 
        (attempt.status === 'pending' || attempt.status === 'processing')
      );
      
      // Verifica se a tentativa não expirou (5 minutos)
      if (activeAttempt) {
        const elapsed = Date.now() - activeAttempt.timestamp;
        const timeoutMs = 5 * 60 * 1000; // 5 minutos
        
        if (elapsed > timeoutMs) {
          console.log(`Tentativa ${activeAttempt.attemptId} expirou, removendo...`);
          await this.removeSyncAttempt(activeAttempt.attemptId);
          return null;
        }
      }
      
      return activeAttempt || null;
    } catch (error) {
      console.error('Erro ao obter tentativa ativa:', error);
      return null;
    }
  }

  // Obtém todas as tentativas de sincronização
  private async getAllSyncAttempts(): Promise<SyncAttempt[]> {
    try {
      const attemptsData = await AsyncStorage.getItem(SYNC_ATTEMPTS_KEY);
      return attemptsData ? JSON.parse(attemptsData) : [];
    } catch (error) {
      console.error('Erro ao obter tentativas de sincronização:', error);
      return [];
    }
  }

  // Salva uma tentativa de sincronização
  private async saveSyncAttempt(attempt: SyncAttempt): Promise<void> {
    try {
      const attempts = await this.getAllSyncAttempts();
      const updatedAttempts = attempts.filter(a => a.attemptId !== attempt.attemptId);
      updatedAttempts.push(attempt);
      
      await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(updatedAttempts));
    } catch (error) {
      console.error('Erro ao salvar tentativa de sincronização:', error);
    }
  }

  // Atualiza status de uma tentativa
  private async updateSyncAttemptStatus(attemptId: string, status: SyncAttempt['status']): Promise<void> {
    try {
      const attempts = await this.getAllSyncAttempts();
      const attemptIndex = attempts.findIndex(a => a.attemptId === attemptId);
      
      if (attemptIndex !== -1) {
        attempts[attemptIndex].status = status;
        attempts[attemptIndex].timestamp = Date.now(); // Atualiza timestamp
        await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(attempts));
        console.log(`Tentativa ${attemptId} atualizada para status: ${status}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar status da tentativa:', error);
    }
  }

  // Remove uma tentativa específica
  private async removeSyncAttempt(attemptId: string): Promise<void> {
    try {
      const attempts = await this.getAllSyncAttempts();
      const filteredAttempts = attempts.filter(a => a.attemptId !== attemptId);
      await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(filteredAttempts));
      console.log(`Tentativa ${attemptId} removida`);
    } catch (error) {
      console.error('Erro ao remover tentativa:', error);
    }
  }

  // Limpa tentativas expiradas
  private async cleanupExpiredAttempts(): Promise<void> {
    try {
      const attempts = await this.getAllSyncAttempts();
      const now = Date.now();
      const timeoutMs = 5 * 60 * 1000; // 5 minutos
      
      const validAttempts = attempts.filter(attempt => {
        const elapsed = now - attempt.timestamp;
        if (elapsed > timeoutMs && attempt.status !== 'completed') {
          console.log(`Tentativa expirada removida: ${attempt.attemptId}`);
          return false;
        }
        return true;
      });
      
      if (validAttempts.length !== attempts.length) {
        await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(validAttempts));
      }
    } catch (error) {
      console.error('Erro ao limpar tentativas expiradas:', error);
    }
  }

  // Força sincronização imediata
  async forceSync(): Promise<void> {
    console.log('forceSync chamado, isRunning:', this.isRunning);
    
    if (this.isRunning) {
      console.log('Sincronização já em execução, processando fila...');
      await this.processQueue();
    } else {
      console.log('Iniciando nova sincronização...');
      this.startSync();
    }
  }

  // Verifica se há itens pendentes na fila
  async hasPendingItems(): Promise<boolean> {
    const queue = await this.getQueue();
    return queue.length > 0;
  }

  // Obtém detalhes dos itens pendentes
  async getPendingItems(): Promise<Array<{
    id: string;
    nome: string;
    frota: string;
    attempts: number;
    canRetry: boolean;
  }>> {
    const queue = await this.getQueue();
    return queue.map(item => ({
      id: item.id,
      nome: item.data.nome || 'Sem nome',
      frota: item.data.frota || 'Sem frota',
      attempts: item.attempts,
      canRetry: item.attempts < MAX_RETRY_ATTEMPTS
    }));
  }

  // Verifica se está sincronizando no momento
  isSyncing(): boolean {
    return this.isRunning;
  }

  // Verifica se um ID específico está sendo processado localmente
  isItemBeingProcessed(itemId: string): boolean {
    return this.processingSyncIds.has(itemId);
  }

  // Verifica se um ID específico está sendo processado globalmente
  async isItemBeingProcessedGlobally(itemId: string): Promise<boolean> {
    const globalIds = await this.getGlobalProcessingIds();
    return globalIds.includes(itemId);
  }

  // Obtém lista de IDs sendo processados no momento
  getProcessingIds(): string[] {
    return Array.from(this.processingSyncIds);
  }

  // Obtém IDs sendo processados globalmente (persistido)
  private async getGlobalProcessingIds(): Promise<string[]> {
    try {
      const processingData = await AsyncStorage.getItem(SYNC_PROCESSING_KEY);
      if (!processingData) return [];
      
      const records: ProcessingRecord[] = JSON.parse(processingData);
      const now = Date.now();
      const timeoutMs = 5 * 60 * 1000; // 5 minutos de timeout
      
      // Filtra registros que não expiraram
      const validRecords = records.filter(record => {
        const elapsed = now - record.timestamp;
        if (elapsed > timeoutMs) {
          console.log(`ID ${record.id} expirou (${elapsed}ms), removendo...`);
          return false;
        }
        return true;
      });
      
      // Se houve limpeza, salva a lista atualizada
      if (validRecords.length !== records.length) {
        await this.saveGlobalProcessingRecords(validRecords);
      }
      
      return validRecords.map(record => record.id);
    } catch (error) {
      console.error('Erro ao obter IDs de processamento global:', error);
      return [];
    }
  }

  // Salva registros de processamento globalmente
  private async saveGlobalProcessingRecords(records: ProcessingRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_PROCESSING_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Erro ao salvar registros de processamento global:', error);
    }
  }

  // Adiciona ID à lista de processamento global
  private async addToGlobalProcessing(itemId: string): Promise<boolean> {
    try {
      console.log(`[DEBUG] Tentando adicionar ${itemId} ao processamento global`);
      const currentIds = await this.getGlobalProcessingIds();
      
      // Se já está sendo processado, retorna false
      if (currentIds.includes(itemId)) {
        console.log(`Item ${itemId} já está sendo processado globalmente`);
        return false;
      }
      
      // Obtem registros atuais
      const processingData = await AsyncStorage.getItem(SYNC_PROCESSING_KEY);
      const currentRecords: ProcessingRecord[] = processingData ? JSON.parse(processingData) : [];
      
      // Adiciona novo registro com timestamp
      const newRecord: ProcessingRecord = {
        id: itemId,
        timestamp: Date.now()
      };
      const updatedRecords = [...currentRecords, newRecord];
      
      await this.saveGlobalProcessingRecords(updatedRecords);
      console.log(`Item ${itemId} adicionado ao processamento global (v2)`);
      return true;
    } catch (error) {
      console.error('Erro ao adicionar ao processamento global (v2):', error);
      return false;
    }
  }

  // Remove ID da lista de processamento global
  private async removeFromGlobalProcessing(itemId: string): Promise<void> {
    try {
      const processingData = await AsyncStorage.getItem(SYNC_PROCESSING_KEY);
      if (!processingData) return;
      
      const currentRecords: ProcessingRecord[] = JSON.parse(processingData);
      const updatedRecords = currentRecords.filter(record => record.id !== itemId);
      
      await this.saveGlobalProcessingRecords(updatedRecords);
      console.log(`Item ${itemId} removido do processamento global`);
    } catch (error) {
      console.error('Erro ao remover do processamento global:', error);
    }
  }

  // Limpa IDs órfãos de processamento (chamado na inicialização)
  private async cleanupOrphanedProcessingIds(): Promise<void> {
    try {
      // Na inicialização, limpa todos os IDs de processamento e tentativas
      // pois se chegou aqui é porque a app foi reiniciada
      await AsyncStorage.removeItem(SYNC_PROCESSING_KEY);
      await AsyncStorage.removeItem(SYNC_ATTEMPTS_KEY);
      console.log('IDs de processamento e tentativas órfãos limpos na inicialização');
    } catch (error) {
      console.error('Erro ao limpar IDs órfãos:', error);
    }
  }

  // Método específico para step7 iniciar sincronização com feedback
  async syncForStep7(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('syncForStep7 chamado');
      
      // Evita múltiplas sincronizações simultâneas
      if (this.isRunning) {
        console.log('Sincronização já em andamento');
        return {
          success: false,
          message: 'Sincronização já em andamento'
        };
      }

      // Limpa tentativas expiradas antes de verificar
      await this.cleanupExpiredAttempts();

      const hasPending = await this.hasPendingItems();
      
      if (!hasPending) {
        console.log('Nenhum item pendente para sincronizar');
        return {
          success: true,
          message: 'Nenhum item pendente para sincronizar'
        };
      }

      // Verifica se há itens sendo processados localmente
      const processingIds = this.getProcessingIds();
      if (processingIds.length > 0) {
        console.log('Itens já sendo processados localmente:', processingIds);
        return {
          success: false,
          message: 'Sincronização já em andamento'
        };
      }

      // Verifica se já existe uma tentativa ativa para algum item pendente
      const pendingItems = await this.getPendingItems();
      for (const item of pendingItems) {
        const activeAttempt = await this.getActiveSyncAttempt(item.id);
        if (activeAttempt) {
          console.log(`Item ${item.id} já possui tentativa ativa: ${activeAttempt.attemptId}`);
          return {
            success: false,
            message: 'Sincronização já em andamento para este item'
          };
        }
      }

      // Verifica conectividade
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        console.log('Sem conexão com a internet');
        return {
          success: false,
          message: 'Sem conexão com a internet'
        };
      }

      console.log('Iniciando sincronização com sistema de tentativas únicas...');
      // Inicia sincronização
      await this.forceSync();
      
      return {
        success: true,
        message: 'Sincronização iniciada'
      };
      
    } catch (error) {
      console.error('Erro em syncForStep7:', error);
      return {
        success: false,
        message: `Erro ao iniciar sincronização: ${(error as Error).message}`
      };
    }
  }
}

// Instância singleton
export const syncService = new SyncService();
export default syncService;

// Exporta NetInfo para uso no step7
export { NetInfo };
