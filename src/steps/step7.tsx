import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, Modal, Alert, ActivityIndicator, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStep } from '../context/StepContext';
import { useVistoria, VistoriaData } from '../context/VistoriaContext';
import { StepIndicator } from '../components/StepIndicator';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePicker from 'react-native-image-crop-picker';
import { TextInput } from 'react-native';
import { Keyboard } from 'react-native';
import { API_URL } from '@env';
import Animated, { FadeInDown, useSharedValue, withSpring } from 'react-native-reanimated';
import { syncService } from '../services/SyncService';

const STORAGE_KEY = '@vistoria_data';

interface PhotoItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  photo: string | null;
  apiKey: string;
}

interface Observation {
  id: string;
  text: string;
  photo: string;
}

interface LoadingStep {
  title: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  message?: string;
}

interface Observacao {
  texto: string;
  foto: string;
}

interface PhotoStatus {
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface PhotoUploadProgress {
  total: number;
  completed: number;
  failed: number;
  statuses: PhotoStatus[];
}

export default function Step7() {
  const { currentStep, setCurrentStep } = useStep();
  const { vistoriaData, updateVistoriaData, clearVistoriaData } = useVistoria();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [currentObservation, setCurrentObservation] = useState<Observation | null>(null);
  const [observationText, setObservationText] = useState('');
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { title: 'Fazendo upload das imagens...', status: 'pending' },
    { title: 'Enviando dados da vistoria...', status: 'pending' }
  ]);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const progressValue = useSharedValue(0);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<PhotoUploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    statuses: []
  });

  // Estados para controle de sincronização
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [canRetrySync, setCanRetrySync] = useState(false);
  const [pendingItems, setPendingItems] = useState<Array<{
    id: string;
    nome: string;
    frota: string;
    attempts: number;
    canRetry: boolean;
  }>>([]);

  useEffect(() => {
    loadSavedData();
    updatePendingItems();
  }, []);

  useEffect(() => {
    console.log('Configurando callbacks do SyncService');
    
    syncService.configureForStep7({
      onStart: () => {
        console.log('Sincronização iniciada');
        setSyncStatus('syncing');
        setSyncMessage('Iniciando sincronização...');
        setShowSyncModal(true);
      },
      onSuccess: (message) => {
        console.log('Sincronização bem-sucedida:', message);
        setSyncStatus('success');
        setSyncMessage(message || 'Sincronização concluída com sucesso!');
        setTimeout(() => {
          console.log('Fechando modal de sincronização e navegando...');
          setShowSyncModal(false);
          setSyncStatus('idle');
          navigateToStep8();
        }, 1500);
      },
      onError: (error, canRetry) => {
        console.log('Erro na sincronização:', error, 'Pode tentar novamente:', canRetry);
        setSyncStatus('error');
        setSyncMessage(error);
        setCanRetrySync(canRetry || false);
      },
      onComplete: () => {
        console.log('Sincronização finalizada');
        updatePendingItems();
      }
    });

    return () => {
      console.log('Limpando callbacks do SyncService');
      syncService.clearSyncCallbacks();
    };
  }, []); 

  const updatePendingItems = async () => {
    try {
      const items = await syncService.getPendingItems();
      setPendingItems(items);
    } catch (error) {
      console.error('Erro ao atualizar itens pendentes:', error);
    }
  };

  const handleManualSync = async () => {
    // Evita múltiplas chamadas simultâneas
    if (syncService.isSyncing() || syncStatus === 'syncing') {
      console.log('Sincronização já em andamento, ignorando clique...');
      return;
    }

    try {
      console.log('Iniciando sincronização manual...');
      
      // Mostra feedback imediato
      setSyncStatus('syncing');
      setSyncMessage('Verificando itens para sincronização...');
      setShowSyncModal(true);
      
      const result = await syncService.syncForStep7();
      
      if (!result.success) {
        setSyncStatus('error');
        
        // Personaliza mensagens de erro
        let errorMessage = result.message;
        let canRetry = true;
        
        if (result.message.includes('já em andamento')) {
          errorMessage = 'Sincronização já está em andamento. Aguarde a conclusão.';
          canRetry = false;
        } else if (result.message.includes('já sendo processados')) {
          errorMessage = 'Itens já estão sendo sincronizados. Aguarde a conclusão.';
          canRetry = false;
        } else if (result.message.includes('Sem conexão')) {
          errorMessage = 'Sem conexão com a internet. Verifique sua conexão e tente novamente.';
          canRetry = true;
        } else if (result.message.includes('Nenhum item pendente')) {
          // Este caso é sucesso, não erro
          setSyncStatus('success');
          setSyncMessage('Não há itens pendentes para sincronizar');
          setCanRetrySync(false);
          
          // Fecha modal automaticamente após 2 segundos
          setTimeout(() => {
            closeSyncModal();
          }, 2000);
          return;
        }
        
        setSyncMessage(errorMessage);
        setCanRetrySync(canRetry);
      }
      // Se success for true, os callbacks já cuidarão do feedback
    } catch (error) {
      console.error('Erro ao tentar sincronização manual:', error);
      setSyncStatus('error');
      setSyncMessage('Erro inesperado ao tentar sincronizar');
      setCanRetrySync(true);
      setShowSyncModal(true);
    }
  };

  const closeSyncModal = () => {
    setShowSyncModal(false);
    setSyncStatus('idle');
    setSyncMessage('');
    setCanRetrySync(false);
  };

  const navigateToStep8 = async () => {
    try {
      const hasPending = await syncService.hasPendingItems();
      
      if (!hasPending) {
        console.log('Todos os itens sincronizados! Navegando para step8...');
        setCurrentStep(7); 
      } else {
        console.log('Ainda há itens pendentes, não navegando...');
        Alert.alert(
          'Sincronização Pendente',
          'Ainda há itens pendentes para sincronizar. Complete a sincronização antes de continuar.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erro ao verificar itens pendentes:', error);
      console.log('Erro ao verificar pendências, navegando mesmo assim...');
      setCurrentStep(7);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      const parsedData = JSON.parse(savedData);

      if (parsedData.observacoes) {
        setObservations(parsedData.observacoes.map((obs: any) => ({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: obs.texto,
          photo: obs.foto
        })));
      }

      updateVistoriaData(parsedData);
    } catch (error) {
      console.error('Erro ao carregar dados do AsyncStorage:', error);
    }
  };

  const handlePhotoCapture = async (uri: string, photoId?: string) => {
    const targetPhotoId = photoId || currentPhotoId;
    console.log('=== handlePhotoCapture ===');
    console.log('currentPhotoId:', currentPhotoId);
    console.log('targetPhotoId (parâmetro):', targetPhotoId);
    console.log('uri recebida:', uri);
    console.log('observationText atual:', observationText);
    
    if (!targetPhotoId) {
      console.log('ERRO: targetPhotoId é null/undefined');
      return;
    }

    try {
      setSubmitting(true);
      
      if (targetPhotoId === 'observation') {
        console.log('Processando foto de observação...');
        console.log('currentObservation antes:', currentObservation);
        
        // Se for uma foto de observação, atualiza o currentObservation
        setCurrentObservation(prev => {
          const newObservation = {
            id: prev?.id || Date.now().toString(),
            text: prev?.text || observationText,
            photo: uri
          };
          console.log('Novo currentObservation:', newObservation);
          return newObservation;
        });
        
        console.log('currentObservation atualizado com foto:', uri);
      } else {
        console.log('Processando foto normal...');
        // Se for uma foto normal, atualiza a lista de fotos
        setPhotos(prev => 
          prev.map(item => 
            item.id === targetPhotoId ? { ...item, photo: uri } : item
          )
        );
      }
    } catch (error) {
      console.error('Erro ao processar foto:', error);
      Alert.alert('Erro', 'Não foi possível processar a foto. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const isValidPhoto = (uri: string): boolean => {
    if (uri.startsWith('file://')) return true;
    
    try {
      const url = new URL(uri);
      if (url.protocol !== 'https:') return false;
      return url.hostname.endsWith('happymobi.com.br') || 
             url.hostname.endsWith('clemar.com.br');
    } catch {
      return false;
    }
  };

  const uploadImages = async (images: { uri: string; type: string; name: string }[]): Promise<{ [key: string]: string }> => {
    console.log('=== uploadImages ===');
    console.log('Imagens para upload:', images);
    
    if (images.length === 0) {
      console.log('Nenhuma imagem para upload');
      return {};
    }

    try {
      // Valida as imagens antes do upload
      for (const image of images) {
        if (!image.uri || !image.uri.startsWith('file://')) {
          throw new Error(`Imagem ${image.name} não é válida para upload`);
        }
        
        // Verifica se o arquivo existe e tem tamanho válido
        if (!image.type || !image.type.startsWith('image/')) {
          throw new Error(`Formato de imagem inválido para ${image.name}`);
        }
      }
      
      // Cria um FormData para enviar as imagens
      const formData = new FormData();
      
      // Adiciona o ID da vistoria se existir
      if (vistoriaData.id) {
        formData.append('id_vistoria', vistoriaData.id.toString());
      }

      // Adiciona cada imagem ao FormData
      for (const image of images) {
        console.log('Adicionando imagem ao FormData:', image.name);
        
        // Cria um arquivo a partir da URI
        const file = {
          uri: image.uri,
          type: image.type,
          name: image.name
        };
        
        formData.append('fotos[]', file as any);
      }

      console.log('Enviando para API de upload...');
      
      // Faz a requisição para a API de upload
      const response = await fetch(`${API_URL}/upload-batch`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Resposta da API:', {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData.erro || `Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Resultado do upload:', result);

      // Mapeia os resultados para as URLs das imagens
      const uploadedUrls: { [key: string]: string } = {};
      
      console.log('Estrutura do resultado:', {
        sucesso: result.sucesso,
        urls: result.urls,
        mensagem: result.mensagem,
        erros: result.erros
      });
      
      if (result.urls && typeof result.urls === 'object') {
        // A API retorna um objeto com as URLs mapeadas pelos nomes das imagens
        console.log('Mapeando URLs do objeto result.urls:', result.urls);
        Object.entries(result.urls).forEach(([imageName, url]) => {
          uploadedUrls[imageName] = url as string;
          console.log(`Mapeado: ${imageName} -> ${url}`);
        });
      } else if (result.urls && Array.isArray(result.urls)) {
        // Se a API retorna um array de URLs, mapeia pelos nomes
        result.urls.forEach((url: string, index: number) => {
          if (images[index]) {
            uploadedUrls[images[index].name] = url;
          }
        });
      } else if (result.fotos && Array.isArray(result.fotos)) {
        // Se a API retorna um array de objetos com nome e URL
        result.fotos.forEach((foto: any) => {
          if (foto.nome && foto.url) {
            uploadedUrls[foto.nome] = foto.url;
          }
        });
      }

      console.log('URLs mapeadas:', uploadedUrls);
      return uploadedUrls;

    } catch (error) {
      console.error('Erro detalhado no upload:', error);
      
      // Se for erro de rede, fornece mensagem específica
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
      }
      
      // Se for erro da API, usa a mensagem retornada
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro desconhecido ao fazer upload das imagens');
    }
  };

  const handleSubmit = async () => {
    const invalidPhotos = photos.filter(photo => photo.photo && !isValidPhoto(photo.photo));
    if (invalidPhotos.length > 0) {
      Alert.alert(
        'Fotos Inválidas',
        'Algumas fotos não foram processadas corretamente. Por favor, revise as imagens antes de enviar.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    setShowLoadingModal(true);
    setCurrentLoadingStep(0);
    setLoadingSteps(steps => steps.map(step => ({ ...step, status: 'pending' })));
    progressValue.value = 0;

    try {
      // Save backup before upload
      const backupData = {
        ...vistoriaData,
        observacoes: observations,
        fotos: photos.reduce((acc, photo) => ({
          ...acc,
          [photo.apiKey]: photo.photo
        }), {})
      };
      await AsyncStorage.setItem(`${STORAGE_KEY}_backup`, JSON.stringify(backupData));

      // 1. Upload das imagens
      setLoadingSteps(steps => steps.map((step, index) => 
        index === 0 ? { ...step, status: 'loading' } : step
      ));

      const imagesToUpload: { uri: string; type: string; name: string }[] = [];

      // Add observation photos
      observations.forEach((obs, index) => {
        if (obs.photo && isValidPhoto(obs.photo)) {
          imagesToUpload.push({
            uri: obs.photo,
            type: 'image/jpeg',
            name: `observation_${index}.jpg`
          });
        }
      });

      // Add main photos
      Object.entries(vistoriaData.fotos).forEach(([key, photo]) => {
        if (photo && isValidPhoto(photo)) {
          imagesToUpload.push({
            uri: photo,
            type: 'image/jpeg',
            name: `main_${key}.jpg`
          });
        }
      });

      setPhotoUploadProgress({
        total: imagesToUpload.length,
        completed: 0,
        failed: 0,
        statuses: imagesToUpload.map(img => ({
          id: img.name,
          status: 'pending'
        }))
      });

      let uploadedUrls: { [key: string]: string } = {};
      let uploadSuccess = false;
      
      if (imagesToUpload.length > 0) {
        try {
          uploadedUrls = await uploadImages(imagesToUpload);
          progressValue.value = withSpring(0.5);
          
          setPhotoUploadProgress(prev => ({
            ...prev,
            completed: prev.total,
            statuses: prev.statuses.map(status => ({
              ...status,
              status: 'completed'
            }))
          }));
          
          uploadSuccess = true;
        } catch (error) {
          console.error('Erro no upload das imagens:', error);
          
          let errorMessage = 'Erro desconhecido ao fazer upload';
          if (error instanceof Error) {
            if (error.message.includes('conexão') || error.message.includes('internet')) {
              errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
            } else if (error.message.includes('tamanho') || error.message.includes('size')) {
              errorMessage = 'Arquivo muito grande. Reduza o tamanho das imagens e tente novamente.';
            } else if (error.message.includes('formato') || error.message.includes('type')) {
              errorMessage = 'Formato de imagem não suportado. Use apenas JPG ou PNG.';
            } else {
              errorMessage = error.message;
            }
          }
          
          setLoadingSteps(steps => steps.map((step, index) => 
            index === 0 ? { ...step, status: 'error', message: errorMessage } : step
          ));
          
          setPhotoUploadProgress(prev => ({
            ...prev,
            failed: prev.total - prev.completed,
            statuses: prev.statuses.map(status => ({
              ...status,
              status: status.status === 'pending' ? 'failed' : status.status,
              error: status.status === 'pending' ? errorMessage : status.error
            }))
          }));
          
          setSubmitting(false);
          return;
        }
      } else {
        console.log('Nenhuma imagem para upload - pulando etapa');
        uploadSuccess = true;
        
        setPhotoUploadProgress({
          total: 0,
          completed: 0,
          failed: 0,
          statuses: []
        });
      }

      if (!uploadSuccess) {
        setSubmitting(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoadingSteps(steps => steps.map((step, index) => 
        index === 0 ? { ...step, status: 'completed' } : step
      ));
      setCurrentLoadingStep(1);

      setLoadingSteps(steps => steps.map((step, index) => 
        index === 1 ? { ...step, status: 'loading' } : step
      ));

      const observacoesFormatadas = observations.map((obs, index) => {
        if (obs.photo.startsWith('file://')) {
          const newUrl = uploadedUrls[`observation_${index}`] || obs.photo;
          return {
            texto: obs.text,
            foto: newUrl
          } as Observacao;
        }
        return {
          texto: obs.text,
          foto: obs.photo
        } as Observacao;
      });

      // Atualiza as fotos principais com as novas URLs
      const fotosAtualizadas = { ...vistoriaData.fotos };
      console.log('Fotos antes da atualização:', fotosAtualizadas);
      console.log('URLs disponíveis:', uploadedUrls);
      
      Object.entries(fotosAtualizadas).forEach(([key, photo]) => {
        if (photo && photo.startsWith('file://')) {
          const newUrl = uploadedUrls[`main_${key}`] || photo;
          console.log(`Atualizando ${key}: ${photo} -> ${newUrl}`);
          fotosAtualizadas[key as keyof typeof fotosAtualizadas] = newUrl;
        }
      });
      
      console.log('Fotos após atualização:', fotosAtualizadas);

      const newData = {
        ...vistoriaData,
        observacoes: observacoesFormatadas,
        fotos: fotosAtualizadas,
        status: 'concluida' as const,
        data_conclusao: new Date().toISOString()
      } as VistoriaData;

      await updateVistoriaData(newData);

      // Envia os dados para a API
      const response = await fetch(`${API_URL}/vistorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dados: {
            nome: newData.nome,
            frota: newData.frota,
            placa: newData.placa,
            modelo: newData.modelo,
            quilometragem: newData.quilometragem,
            checklist: newData.checklist,
            avaliacoes: newData.avaliacoes,
            estado_tecnico: newData.estado_tecnico,
            fotos: fotosAtualizadas,
            observacoes: observacoesFormatadas
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar dados: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.id) {
        await updateVistoriaData({ ...newData, id: result.id });
      }

      progressValue.value = withSpring(1);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoadingSteps(steps => steps.map((step, index) => 
        index === 1 ? { ...step, status: 'completed' } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowLoadingModal(false);
      // clearVistoriaData();
      setCurrentStep(7);
    } catch (error) {
      setShowLoadingModal(false);
      console.error('Erro ao salvar dados:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setLoadingSteps(steps => steps.map(step => 
        step.status === 'loading' ? { ...step, status: 'error', message: errorMessage } : step
      ));
      
      try {
        const observacoesFormatadas = observations.map(obs => ({
          texto: obs.text,
          foto: obs.photo
        }));

        const fotosAtualizadas = { ...vistoriaData.fotos };

        const newData = {
          ...vistoriaData,
          observacoes: observacoesFormatadas,
          fotos: fotosAtualizadas,
          status: 'concluida' as const,
          data_conclusao: new Date().toISOString()
        } as VistoriaData;

        const syncId = await syncService.addToQueue(newData);
        console.log('Dados adicionados à fila de sincronização com ID:', syncId);
        
        await updatePendingItems();
        
        Alert.alert(
          'Dados Salvos', 
          'Não foi possível enviar os dados agora, mas eles foram salvos e serão enviados automaticamente quando houver conexão estável.\n\nVocê pode tentar enviar novamente usando o botão de sincronização.',
          [
            { 
              text: 'OK' 
            },
            {
              text: 'Tentar Agora',
              onPress: handleManualSync
            }
          ]
        );
      } catch (queueError) {
        console.error('Erro ao adicionar à fila de sincronização:', queueError);
        Alert.alert('Erro', 'Não foi possível salvar os dados. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const retryUpload = async () => {
    setSubmitting(true);
    setCurrentLoadingStep(0);
    setLoadingSteps(steps => steps.map(step => ({ ...step, status: 'pending' })));
    progressValue.value = 0;

    // Força sincronização imediata
    try {
      await syncService.forceSync();
      console.log('Sincronização forçada iniciada');
    } catch (error) {
      console.error('Erro ao forçar sincronização:', error);
    }

    try {
      // 1. Upload das imagens
      setLoadingSteps(steps => steps.map((step, index) => 
        index === 0 ? { ...step, status: 'loading' } : step
      ));

      const imagesToUpload: { uri: string; type: string; name: string }[] = [];

      // Add observation photos
      observations.forEach((obs, index) => {
        if (obs.photo && isValidPhoto(obs.photo)) {
          imagesToUpload.push({
            uri: obs.photo,
            type: 'image/jpeg',
            name: `observation_${index}.jpg`
          });
        }
      });

      // Add main photos
      Object.entries(vistoriaData.fotos).forEach(([key, photo]) => {
        if (photo && isValidPhoto(photo)) {
          imagesToUpload.push({
            uri: photo,
            type: 'image/jpeg',
            name: `main_${key}.jpg`
          });
        }
      });

      // Initialize upload progress
      setPhotoUploadProgress({
        total: imagesToUpload.length,
        completed: 0,
        failed: 0,
        statuses: imagesToUpload.map(img => ({
          id: img.name,
          status: 'pending'
        }))
      });

      // Upload images if any
      let uploadedUrls: { [key: string]: string } = {};
      
      if (imagesToUpload.length > 0) {
        try {
          uploadedUrls = await uploadImages(imagesToUpload);
          progressValue.value = withSpring(0.5);
          
          // Update progress
          setPhotoUploadProgress(prev => ({
            ...prev,
            completed: prev.total,
            statuses: prev.statuses.map(status => ({
              ...status,
              status: 'completed'
            }))
          }));
          
          // Aguarda 1 segundo antes de mostrar o próximo passo
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLoadingSteps(steps => steps.map((step, index) => 
            index === 0 ? { ...step, status: 'completed' } : step
          ));
          setCurrentLoadingStep(1);

          // 2. Enviando dados da vistoria
          setLoadingSteps(steps => steps.map((step, index) => 
            index === 1 ? { ...step, status: 'loading' } : step
          ));

          // Atualiza as observações com as novas URLs
          const observacoesFormatadas = observations.map((obs, index) => {
            if (obs.photo.startsWith('file://')) {
              const newUrl = uploadedUrls[`observation_${index}`] || obs.photo;
              return {
                texto: obs.text,
                foto: newUrl
              } as Observacao;
            }
            return {
              texto: obs.text,
              foto: obs.photo
            } as Observacao;
          });

          // Atualiza as fotos principais com as novas URLs
          const fotosAtualizadas = { ...vistoriaData.fotos };
          console.log('Fotos antes da atualização (retry):', fotosAtualizadas);
          console.log('URLs disponíveis (retry):', uploadedUrls);
          
          Object.entries(fotosAtualizadas).forEach(([key, photo]) => {
            if (photo && photo.startsWith('file://')) {
              const newUrl = uploadedUrls[`main_${key}`] || photo;
              console.log(`Atualizando ${key} (retry): ${photo} -> ${newUrl}`);
              fotosAtualizadas[key as keyof typeof fotosAtualizadas] = newUrl;
            }
          });
          
          console.log('Fotos após atualização (retry):', fotosAtualizadas);

          const newData = {
            ...vistoriaData,
            observacoes: observacoesFormatadas,
            fotos: fotosAtualizadas,
            status: 'concluida' as const,
            data_conclusao: new Date().toISOString()
          } as VistoriaData;

          await updateVistoriaData(newData);

          // // Envia os dados para a API
          const response = await fetch(`${API_URL}/vistorias`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dados: {
                nome: newData.nome,
                frota: newData.frota,
                quilometragem: newData.quilometragem,
                checklist: newData.checklist,
                avaliacoes: newData.avaliacoes,
                estado_tecnico: newData.estado_tecnico,
                fotos: fotosAtualizadas,
                observacoes: observacoesFormatadas
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Erro ao enviar dados: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();

          if (result.id) {
            await updateVistoriaData({ ...newData, id: result.id });
          }

          progressValue.value = withSpring(1);

          // Aguarda 1 segundo antes de mostrar o próximo passo
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLoadingSteps(steps => steps.map((step, index) => 
            index === 1 ? { ...step, status: 'completed' } : step
          ));

          // Aguarda mais 1 segundo antes de fechar o modal
          await new Promise(resolve => setTimeout(resolve, 1000));
          setShowLoadingModal(false);
          
        } catch (error) {
          console.error('Erro no retry do upload das imagens:', error);
          
          // Determina a mensagem de erro apropriada
          let errorMessage = 'Erro desconhecido ao fazer upload';
          if (error instanceof Error) {
            if (error.message.includes('conexão') || error.message.includes('internet')) {
              errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
            } else if (error.message.includes('tamanho') || error.message.includes('size')) {
              errorMessage = 'Arquivo muito grande. Reduza o tamanho das imagens e tente novamente.';
            } else if (error.message.includes('formato') || error.message.includes('type')) {
              errorMessage = 'Formato de imagem não suportado. Use apenas JPG ou PNG.';
            } else {
              errorMessage = error.message;
            }
          }
          
          setLoadingSteps(steps => steps.map((step, index) => 
            index === 0 ? { ...step, status: 'error', message: errorMessage } : step
          ));
          
          // Update progress with error
          setPhotoUploadProgress(prev => ({
            ...prev,
            failed: prev.total - prev.completed,
            statuses: prev.statuses.map(status => ({
              ...status,
              status: status.status === 'pending' ? 'failed' : status.status,
              error: status.status === 'pending' ? errorMessage : status.error
            }))
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao tentar novamente:', error);
      setLoadingSteps(steps => steps.map(step => 
        step.status === 'loading' ? { ...step, status: 'error', message: (error as Error).message } : step
      ));
      Alert.alert('Erro', 'Não foi possível tentar novamente. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPhotoGuide = (id: string) => {
    switch (id) {
      case '1': // Frente
        return {
          icon: 'camera-front',
          text: 'Centralize a frente do veículo',
          overlay: 'front'
        };
      case '2': // Traseira
        return {
          icon: 'camera-rear',
          text: 'Centralize a traseira do veículo',
          overlay: 'rear'
        };
      case '3': // Lateral Esquerda
        return {
          icon: 'arrow-left',
          text: 'Capture todo o lado esquerdo',
          overlay: 'left'
        };
      case '4': // Lateral Direita
        return {
          icon: 'arrow-right',
          text: 'Capture todo o lado direito',
          overlay: 'right'
        };
      case '5': // Hodômetro
        return {
          icon: 'speed',
          text: 'Centralize o painel do veículo',
          overlay: 'dashboard'
        };
      default:
        return {
          icon: 'camera',
          text: 'Tire a foto',
          overlay: 'front'
        };
    }
  };

  const takePhoto = (id: string) => {
    takePicture(id);
  };

  const retakePhoto = (id: string) => {
    setPhotos(prev => 
      prev.map(item => 
        item.id === id ? { ...item, photo: null } : item
      )
    );
  };

  const photosTaken = photos.filter(photo => photo.photo !== null).length;

  const insets = useSafeAreaInsets();

  const takePicture = async (photoId?: string) => {
    const targetPhotoId = photoId || currentPhotoId;
    console.log('=== takePicture ===');
    console.log('currentPhotoId antes de abrir câmera:', currentPhotoId);
    console.log('targetPhotoId (parâmetro):', targetPhotoId);
    
    try {
      setSubmitting(true);
      console.log('Abrindo câmera...');
      
      const image = await ImagePicker.openCamera({
        width: 1080,
        height: 810,
        cropping: true,
        cropperToolbarTitle: 'Ajustar Foto',
        cropperActiveWidgetColor: '#004F9F',
        cropperStatusBarColor: '#004F9F',
        cropperToolbarColor: '#004F9F',
        cropperToolbarWidgetColor: '#FFFFFF',
        cropperCircleOverlay: false,
        freeStyleCropEnabled: false,
        mediaType: 'photo',
        compressImageMaxWidth: 1280,
        compressImageMaxHeight: 720,
        compressImageQuality: 0.8,
        includeBase64: false,
        forceJpg: true,
        hideBottomControls: true,
        useFrontCamera: false,
        showCropGuidelines: true,
        showCropFrame: true,
        enableRotationGesture: false,
        cropperCancelText: 'Cancelar',
        cropperChooseText: 'Confirmar'
      });

      console.log('Imagem capturada:', image);
      console.log('Caminho da imagem:', image.path);
      
      // Se foi passado um photoId específico, usa ele
      if (targetPhotoId) {
        await handlePhotoCapture(image.path, targetPhotoId);
      } else {
        await handlePhotoCapture(image.path);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Erro ao tirar foto:', error);
        Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
      } else {
        console.log('Usuário cancelou a captura da foto');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddObservation = () => {
    console.log('=== handleAddObservation ===');
    console.log('Limpando estados...');
    console.log('currentObservation antes:', currentObservation);
    console.log('currentPhotoId antes:', currentPhotoId);
    
    setCurrentObservation(null);
    setObservationText('');
    setCurrentPhotoId(null);
    setShowObservationModal(true);
    
    console.log('Modal aberto, estados limpos');
  };

  const handleSaveObservation = async (photoUri: string | null) => {
    if (!observationText.trim()) return;

    const newObservation: Observation = {
      id: currentObservation?.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: observationText.trim(),
      photo: currentObservation?.photo || photoUri || ''
    };

    setObservations(prev => [...prev, newObservation]);
    setShowObservationModal(false);
    setObservationText('');
    setCurrentObservation(null);
  };

  const handleDeleteObservation = (id: string) => {
    setObservations(prev => prev.filter(obs => obs.id !== id));
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 + insets.top, paddingBottom: 100 + insets.bottom }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setCurrentStep(5)} className="w-8">
            <Icon name="chevron-left" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator currentStep={currentStep} totalSteps={6} />
          </View>
        </View>

        <View className="items-center space-y-3 mb-6 mt-4">
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Observações e Avarias
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Registre avarias, danos ou observações importantes sobre o veículo
          </Text>
          
          {/* <SyncIndicator className="w-full" /> */}
          
          {/* Botão de Sincronização Manual */}
          {pendingItems.length > 0 && (
            <TouchableOpacity
              onPress={handleManualSync}
              disabled={syncService.isSyncing() || syncStatus === 'syncing'}
              className={`flex-row items-center justify-center bg-orange-50 border border-orange-200 rounded-full px-4 py-2 mt-2 ${
                (syncService.isSyncing() || syncStatus === 'syncing') ? 'opacity-50' : ''
              }`}
            >
              {(syncService.isSyncing() || syncStatus === 'syncing') ? (
                <ActivityIndicator 
                  size="small" 
                  color="#F97316" 
                  style={{ marginRight: 8 }} 
                />
              ) : (
                <Icon 
                  name="sync" 
                  size={16} 
                  color="#F97316" 
                  style={{ marginRight: 8 }}
                />
              )}
              <Text className="text-orange-600 font-medium text-sm">
                {(syncService.isSyncing() || syncStatus === 'syncing')
                  ? 'Sincronizando...' 
                  : `Sincronizar ${pendingItems.length} item${pendingItems.length > 1 ? 's' : ''} pendente${pendingItems.length > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="gap-4">
          {photos.map((item) => {
            const guide = getPhotoGuide(item.id);
            return (
              <View key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <View className="flex-row items-center p-4 bg-gray-50">
                  <Icon name={guide.icon} size={24} color="#004F9F" style={{ marginRight: 12 }} />
                  <View className="flex-1">
                    <Text className="text-lg font-medium text-gray-900">{item.name}</Text>
                    <Text className="text-sm text-gray-500">{guide.text}</Text>
                  </View>
                  {item.photo && (
                    <View className="bg-green-100 px-3 py-1 rounded-full">
                      <Text className="text-green-600 text-sm font-medium">Concluído</Text>
                    </View>
                  )}
                </View>
                <View className="aspect-[4/3] bg-gray-100">
                  {item.photo ? (
                    <View className="relative">
                      <Image 
                        source={{ uri: item.photo }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => retakePhoto(item.id)}
                        className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-full shadow-sm"
                      >
                        <Icon name="refresh" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => takePhoto(item.id)}
                      className="flex-1 items-center justify-center"
                    >
                      <View className="items-center">
                        <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-2">
                          <Icon name="add-a-photo" size={32} color="#004F9F" />
                        </View>
                        <Text className="text-blue-600 font-medium">Tirar Foto</Text>
                        <Text className="text-gray-500 text-sm mt-1">{guide.text}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {/* Seção de Documentação Adicional */}
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                  <Icon name="description" size={24} color="#F97316" />
                </View>
                <View>
                  <View className="flex-row items-center">
                    <Text className="text-xl font-bold text-gray-900">Registros Adicionais</Text>
                    <View className="bg-orange-100 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-xs text-orange-600 font-medium">Opcional</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-500 mt-1">Documente avarias, danos ou observações</Text>
                </View>
              </View>
            </View>

            {/* Container de Observações */}
            <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Lista de Observações */}
              <View className="p-4">
                {observations.length === 0 ? (
                  <TouchableOpacity
                    onPress={handleAddObservation}
                    className="items-center justify-center py-8 border-2 border-dashed border-orange-200 rounded-xl"
                  >
                    <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-3">
                      <Icon name="add" size={32} color="#F97316" />
                    </View>
                    <Text className="text-orange-600 font-medium text-lg">Adicionar Registro</Text>
                    <Text className="text-gray-500 text-sm mt-1 text-center">
                      Toque para documentar uma avaria,{'\n'}
                      dano ou observação importante
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="gap-3">
                    {observations.map((observation) => (
                      <View
                        key={observation.id}
                        className="bg-gray-50 rounded-lg p-4"
                      >
                        <View className="flex-row items-start justify-between mb-3">
                          <Text className="text-base text-gray-900 flex-1 mr-4">{observation.text}</Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteObservation(observation.id)}
                            className="p-2"
                          >
                            <Icon name="delete" size={24} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                        {observation.photo && (
                          <View className="aspect-[4/3] bg-white rounded-lg overflow-hidden">
                            <Image
                              source={{ uri: observation.photo }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          </View>
                        )}
                      </View>
                    ))}
                    
                    <TouchableOpacity
                      onPress={handleAddObservation}
                      className="flex-row items-center justify-center py-3 bg-orange-50 rounded-lg mt-2"
                    >
                      <Icon name="add" size={24} color="#F97316" />
                      <Text className="text-orange-600 font-medium ml-2">Adicionar Outro Registro</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botão Continuar */}
      <View style={{
        position: 'absolute',
        bottom: insets.bottom + 16,
        left: 24,
        right: 24,
      }}>
        <View style={{ borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#004F9F', '#009FE3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%' }}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={submitting || loadingSteps.some(step => step.status === 'error')}
              className={`${(submitting || loadingSteps.some(step => step.status === 'error')) ? 'bg-gray-300' : ''} ${submitting ? 'opacity-50' : ''}`}
            >
              <View className="flex-row items-center justify-center py-4">
                <Text className="text-white text-lg font-semibold">
                  {submitting ? 'Enviando...' : 'Finalizar Inspeção'}
                </Text>
                {!submitting && (
                  <Icon name="check-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />
                )}
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>

      {/* Modal de Observação */}
      <Modal
        visible={showObservationModal}
        animationType="slide"
        onRequestClose={() => setShowObservationModal(false)}
      >
        <View className="flex-1 bg-white">
          {/* Cabeçalho do Modal */}
          <View style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={['#F97316', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: '100%' }}
            >
              <View className="px-4 py-6">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    onPress={() => setShowObservationModal(false)}
                    className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
                  >
                    <Icon name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text className="text-white text-xl font-bold">Nova observação
                  </Text>
                  <View style={{ width: 40 }} />
                </View>
              </View>
            </LinearGradient>
          </View>

          <ScrollView 
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
          >
            <View className="p-4">
              {/* Campo de Texto */}
              <View className="mb-6">
                <View className="flex-row items-center mb-2">
                  <Icon name="report-problem" size={20} color="#F97316" style={{ marginRight: 8 }} />
                  <Text className="text-gray-900 font-medium">Descrição do Registro</Text>
                </View>
                <View className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                  <TextInput
                    className="p-4 text-base text-base text-gray-900 min-h-[120px]"
                    placeholder="Ex: Amassado na porta traseira direita, arranhão no para-choque, trinca no para-brisa..."
                    placeholderTextColor="#9CA3AF"
                    value={observationText}
                    onChangeText={setObservationText}
                    textAlignVertical="top"
                    onBlur={() => Keyboard.dismiss()}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Área da Foto */}
              <View>
                <View className="flex-row items-center mb-2">
                  <Icon name="photo-camera" size={20} color="#F97316" style={{ marginRight: 8 }} />
                  <Text className="text-gray-900 font-medium">Foto do Registro</Text>
                  <View className="bg-orange-100 px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-xs text-orange-600 font-medium">Opcional</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    console.log('=== Botão de foto pressionado ===');
                    console.log('Chamando takePicture com photoId "observation"');
                    takePicture('observation');
                  }}
                  className="aspect-[4/3] bg-gray-50 rounded-xl items-center justify-center border-2 border-dashed border-gray-300 shadow-sm overflow-hidden"
                >
                  {(() => {
                    console.log('=== Render da área de foto ===');
                    console.log('currentObservation:', currentObservation);
                    console.log('currentObservation?.photo:', currentObservation?.photo);
                    console.log('currentObservation?.photo existe?', !!currentObservation?.photo);
                    
                                        return currentObservation?.photo ? (
                      <TouchableOpacity
                        onPress={() => {
                          takePicture('observation');
                        }}
                        className="relative w-full h-full"
                      >
                        <Image
                          source={{ uri: currentObservation.photo }}
                          className="w-full h-full rounded-xl"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setCurrentObservation(prev => prev ? { ...prev, photo: '' } : null);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full items-center justify-center"
                        >
                          <Icon name="close" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ) : (
                      <View className="items-center">
                        <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-2">
                          <Icon name="add-a-photo" size={32} color="#F97316" />
                        </View>
                        <Text className="text-orange-600 font-medium">Adicionar Foto</Text>
                        <Text className="text-gray-500 text-sm mt-1">Toque para tirar uma foto</Text>
                      </View>
                    );
                  })()}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Botão Salvar */}
          <View className="p-4 border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={() => handleSaveObservation(currentObservation?.photo || null)}
              disabled={!observationText.trim()}
              className={`bg-orange-500 rounded-xl py-4 items-center ${!observationText.trim() ? 'opacity-50' : ''}`}
            >
              <Text className="text-white font-semibold text-lg">Adicionar Registro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Loading */}
      <Modal
        visible={showLoadingModal}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <Animated.View 
            entering={FadeInDown.duration(500)}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-3">
                <Icon name="cloud-upload" size={32} color="#004F9F" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                Finalizando Vistoria
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                Enviando imagens e dados para o servidor
              </Text>
            </View>

            <View className="space-y-4">
              {loadingSteps.map((step, index) => {
                // Só mostra o passo atual e os anteriores
                if (index > currentLoadingStep) return null;
                
                return (
                  <Animated.View 
                    key={index}
                    entering={FadeInDown.duration(500).delay(index * 200)}
                    className="flex-row items-center bg-gray-50 p-4 rounded-xl"
                  >
                    <View className="w-10 h-10 mr-3">
                      {step.status === 'pending' && (
                        <View className="w-10 h-10 rounded-full border-2 border-gray-300 items-center justify-center">
                          <Text className="text-gray-400 font-medium">{index + 1}</Text>
                        </View>
                      )}
                      {step.status === 'loading' && (
                        <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                          <ActivityIndicator size="small" color="#004F9F" />
                        </View>
                      )}
                      {step.status === 'completed' && (
                        <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center">
                          <Icon name="check-circle" size={24} color="#10B981" />
                        </View>
                      )}
                      {step.status === 'error' && (
                        <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                          <Icon name="error" size={24} color="#EF4444" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 flex-row items-start">
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900">
                          {step.title}
                        </Text>

                        {step.message && (
                          <Text className="text-sm text-red-500 mt-1">
                            {step.message}
                          </Text>
                        )}
                      </View>
                      {step.status === 'error' && (
                        <TouchableOpacity
                          onPress={retryUpload}
                          className="ml-2 p-2 bg-red-50 rounded-full"
                          accessibilityLabel="Tentar novamente"
                          accessibilityHint="Tenta reenviar os dados que falharam"
                          accessibilityRole="button"
                        >
                          <Icon name="refresh" size={22} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Animated.View>
                );
              })}

              {/* Barra de Progresso Principal */}
              <Animated.View 
                entering={FadeInDown.duration(500).delay(300)}
                className="mt-6"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-gray-900">
                    Progresso Geral
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {Math.round(progressValue.value * 100)}%
                  </Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <Animated.View 
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${progressValue.value * 100}%`
                    }}
                  />
                </View>
              </Animated.View>

              {currentLoadingStep === loadingSteps.length - 1 && loadingSteps.every(step => step.status === 'completed') && (
                <Animated.View 
                  entering={FadeInDown.duration(500).delay(500)}
                  className="mt-6"
                >
                  <View className="bg-green-50 rounded-xl p-4 flex-row items-center">
                    <Icon name="check-circle" size={24} color="#10B981" />
                    <Text className="text-green-600 font-medium ml-2">
                      Vistoria concluída com sucesso!
                    </Text>
                  </View>
                </Animated.View>
              )}

            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Sincronização */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <Animated.View 
            entering={FadeInDown.duration(300)}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <View className="items-center mb-4">
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
                syncStatus === 'syncing' ? 'bg-blue-50' :
                syncStatus === 'success' ? 'bg-green-50' :
                syncStatus === 'error' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                {syncStatus === 'syncing' && (
                  <ActivityIndicator size="large" color="#004F9F" />
                )}
                {syncStatus === 'success' && (
                  <Icon name="check-circle" size={32} color="#10B981" />
                )}
                {syncStatus === 'error' && (
                  <Icon name="error" size={32} color="#EF4444" />
                )}
                {syncStatus === 'idle' && (
                  <Icon name="sync" size={32} color="#6B7280" />
                )}
              </View>
              
              <Text className="text-xl font-bold text-gray-900 text-center">
                {syncStatus === 'syncing' && 'Sincronizando...'}
                {syncStatus === 'success' && 'Sucesso!'}
                {syncStatus === 'error' && 'Erro na Sincronização'}
                {syncStatus === 'idle' && 'Sincronização'}
              </Text>
              
              <Text className="text-sm text-gray-500 text-center mt-1">
                {syncMessage}
              </Text>
            </View>

            {/* Lista de itens pendentes */}
            {pendingItems.length > 0 && syncStatus !== 'syncing' && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Itens pendentes ({pendingItems.length}):
                </Text>
                <View className="max-h-32 bg-gray-50 rounded-lg p-3">
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {pendingItems.map((item, index) => (
                      <View key={item.id} className="flex-row items-center justify-between py-1">
                        <View className="flex-1">
                          <Text className="text-sm text-gray-900">{item.nome}</Text>
                          <Text className="text-xs text-gray-500">Frota: {item.frota}</Text>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="text-xs text-gray-400 mr-2">
                            {item.attempts}/{3} tentativas
                          </Text>
                          <View className={`w-2 h-2 rounded-full ${item.canRetry ? 'bg-orange-400' : 'bg-red-400'}`} />
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Botões */}
            <View className="space-y-3">
              {syncStatus === 'error' && canRetrySync && (
                <TouchableOpacity
                  onPress={handleManualSync}
                  disabled={syncService.isSyncing()}
                  className={`bg-orange-500 rounded-xl py-3 items-center ${
                    syncService.isSyncing() ? 'opacity-50' : ''
                  }`}
                >
                  <View className="flex-row items-center">
                    <Icon name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text className="text-white font-semibold">Tentar Novamente</Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {syncStatus !== 'syncing' && (
                <TouchableOpacity
                  onPress={syncStatus === 'success' ? navigateToStep8 : closeSyncModal}
                  className={`rounded-xl py-3 items-center ${
                    syncStatus === 'success' ? 'bg-green-500' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`font-medium ${
                    syncStatus === 'success' ? 'text-white' : 'text-gray-700'
                  }`}>
                    {syncStatus === 'success' ? 'Finalizar Vistoria' : 'Fechar'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
