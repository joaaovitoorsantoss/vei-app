import React, { useEffect, useState } from 'react';
import { View, Text, Image, Dimensions, TouchableOpacity, Modal, Linking, ActivityIndicator, Alert, Platform, BackHandler } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useStep } from '../context/StepContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL, PROJECT_VERSION } from '@env';
import { useVistoria } from '../context/VistoriaContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { version } from '../../package.json';
const { width } = Dimensions.get('window');


export default function Step1() {
  const { currentStep, setCurrentStep } = useStep();
  const { clearVistoriaData } = useVistoria();
  const insets = useSafeAreaInsets();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isVersionValid, setIsVersionValid] = useState(true);
  const [updateMessage, setUpdateMessage] = useState('Uma nova versão do aplicativo está disponível. Por favor, atualize para continuar usando.');
  const [storeUrl, setStoreUrl] = useState('https://vps.happymobi.com.br/vistorias/download/VEI.apk');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    checkAppVersion();
  }, []);

  const checkAppVersion = async () => {
    try {
      const currentVersion = PROJECT_VERSION || '1.0.0';
      const response = await axios.get(`${API_URL}/version`);
      console.log(API_URL, PROJECT_VERSION)
      const { minVersion, forceUpdate, message, storeUrl } = response.data;
      console.log(response.data, currentVersion, minVersion)

      if (compareVersions(currentVersion, minVersion) < 0) {
        setIsVersionValid(!forceUpdate);
        setShowUpdateModal(true);
        if (message) setUpdateMessage(message);
        if (storeUrl) setStoreUrl(storeUrl);
      }
    } catch (error) {
      console.error('Erro ao verificar versão:', error);
      setIsVersionValid(true);
    }
  };

  const compareVersions = (v1: string, v2: string) => {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }
    return 0;
  };

  const handleUpdate = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      await clearVistoriaData();
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);

      const url = storeUrl || 'https://vps.happymobi.com.br/vistorias/download/VEI.apk';
      await Linking.openURL(url);

      setTimeout(() => BackHandler.exitApp(), 3000);
    } catch (error) {
      console.error('Erro detalhado ao atualizar:', error);
      Alert.alert('Erro', 'Não foi possível baixar a atualização. Por favor, tente novamente.')
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (!isVersionValid) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Modal
          visible={showUpdateModal}
          transparent
          animationType="fade"
          onRequestClose={() => { }}
        >
          <View className="flex-1 bg-black/50 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                  <Icon name="update" size={32} color="#EF4444" />
                </View>
                <Text className="text-xl font-bold text-gray-900 text-center">
                  Atualização Necessária
                </Text>
                <Text className="text-gray-600 text-center mt-2">
                  {updateMessage}
                </Text>
              </View>

              {isDownloading ? (
                <View className="items-center">
                  <ActivityIndicator size="large" color="#004F9F" />
                  <Text className="text-gray-600 mt-2">
                    Baixando atualização... {Math.round(downloadProgress * 100)}%
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleUpdate}
                  className="bg-blue-500 py-4 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold">
                    Atualizar Agora
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-6" style={{ paddingTop: 18 + insets.top }}>
        {/* Logo e Título */}
        <View className="items-center space-y-3">
          <Image
            source={require('../../assets/logo.png')}
            style={{
              width: width * 0.4,
              height: width * 0.12,
            }}
            resizeMode="contain"
          />
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-900 text-center">
              VEI - Vistoria de Veículos
            </Text>
            <Text className="text-sm text-gray-600 text-center mt-1">
              Inspeção completa e profissional
            </Text>
          </View>
        </View>

        {/* Imagem do Carro */}
        <View className="items-center justify-center flex-1">
          <View className="rounded-3xl p-4">
            <Image
              source={require('../../assets/polo.png')}
              resizeMode="contain"
              style={{
                width: width * 0.8,
                height: width * 0.4,
              }}
            />
            <Image
              source={require('../../assets/van.png')}
              resizeMode="contain"
              style={{
                width: width * 0.8,
                height: width * 0.4,
              }}
            />
          </View>
        </View>

        {/* Informações Principais */}
        <View className="flex-row justify-between mb-6" style={{ marginBottom: 130 + insets.bottom }}>
          <View className="items-center flex-1">
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Icon name="check-circle" size={24} color="#004F9F" />
            </View>
            <Text className="text-sm font-medium text-gray-900">Checklist</Text>
            <Text className="text-xs text-gray-500">Completo</Text>
          </View>
          <View className="items-center flex-1">
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Icon name="photo-camera" size={24} color="#004F9F" />
            </View>
            <Text className="text-sm font-medium text-gray-900">Fotos</Text>
            <Text className="text-xs text-gray-500">Registro</Text>
          </View>
          <View className="items-center flex-1">
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Icon name="description" size={24} color="#004F9F" />
            </View>
            <Text className="text-sm font-medium text-gray-900">Relatório</Text>
            <Text className="text-xs text-gray-500">Detalhado</Text>
          </View>
        </View>

        {/* Versão do App - Discreta */}
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 110,
          right: 24,
        }}>
          <Text className="text-xs text-gray-400 opacity-60">
            v{version}
          </Text>
        </View>

        {/* Botão Iniciar */}
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 55,
          left: 24,
          right: 24,
        }}>
          <LinearGradient
            colors={['#004F9F', '#009FE3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 12 }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setCurrentStep(1)}
            >
              <View className="flex-row items-center justify-center py-4">
                <Text className="text-white text-lg font-semibold">
                  Iniciar Vistoria
                </Text>
                <Icon name="arrow-forward" size={24} color="#fff" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Botão Check-in - Discreto */}
        <View style={{
          position: 'absolute',
          bottom: insets.bottom + 10,
          left: 24,
          right: 24,
        }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCurrentStep('checkin')}
            className="flex-row items-center justify-center py-3"
          >
            <Text className="text-gray-500 text-sm font-medium mr-2 underline">
              Fazer Check-in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
