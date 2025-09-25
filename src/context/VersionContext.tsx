import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Linking, BackHandler, AppState } from 'react-native';
import axios from 'axios';
import { API_URL, PROJECT_VERSION } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVistoria } from './VistoriaContext';

interface VersionContextData {
  isVersionValid: boolean;
  showUpdateModal: boolean;
  updateMessage: string;
  storeUrl: string;
  isDownloading: boolean;
  downloadProgress: number;
  checkAppVersion: () => Promise<void>;
  handleUpdate: () => Promise<void>;
}

const VersionContext = createContext<VersionContextData>({} as VersionContextData);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [isVersionValid, setIsVersionValid] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('Uma nova versão do aplicativo está disponível. Por favor, atualize para continuar usando.');
  const [storeUrl, setStoreUrl] = useState('https://vps1.clemar.com.br/download/VEI.apk');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { clearVistoriaData } = useVistoria();

  const compareVersions = (v1: string, v2: string) => {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);

    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = v1Parts[i] || 0;
      const part2 = v2Parts[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    return 0;
  };

  const checkAppVersion = async () => {
    try {
      const currentVersion = PROJECT_VERSION || '1.0.0';
      const response = await axios.get(`${API_URL}/version`);
      console.log(API_URL, PROJECT_VERSION)
      const { minVersion, forceUpdate, message, storeUrl } = response.data;
      
      if (compareVersions(currentVersion, minVersion) < 0) {
        setIsVersionValid(!forceUpdate);
        setShowUpdateModal(true);
        if (message) setUpdateMessage(message);
        if (storeUrl) setStoreUrl(storeUrl);
      } else {
        setIsVersionValid(true);
        setShowUpdateModal(false);
      }
    } catch (error) {
      console.error('Erro ao verificar versão:', error);
      setIsVersionValid(true);
      setShowUpdateModal(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await clearVistoriaData();
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);

      const url = storeUrl || 'https://vps1.clemar.com.br/download/VEI.apk';
      await Linking.openURL(url);

      setTimeout(() => BackHandler.exitApp(), 3000);
    } catch (error) {
      console.error('Erro detalhado ao atualizar:', error);
      Alert.alert('Erro', 'Não foi possível baixar a atualização. Por favor, tente novamente.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Verifica a versão quando o app inicia
  useEffect(() => {
    checkAppVersion();
  }, []);

  // Verifica a versão quando o app volta para o primeiro plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAppVersion();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Verifica a versão a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      checkAppVersion();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  return (
    <VersionContext.Provider
      value={{
        isVersionValid,
        showUpdateModal,
        updateMessage,
        storeUrl,
        isDownloading,
        downloadProgress,
        checkAppVersion,
        handleUpdate,
      }}
    >
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
} 