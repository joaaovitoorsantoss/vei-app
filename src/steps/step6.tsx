import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStep } from '../context/StepContext';
import { useVistoria } from '../context/VistoriaContext';
import { StepIndicator } from '../components/StepIndicator';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImagePicker from 'react-native-image-crop-picker';
const STORAGE_KEY = '@vistoria_data';

interface PhotoItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  photo: string | null;
  apiKey: string;
}

export default function Step6() {
  const { currentStep, setCurrentStep } = useStep();
  const { vistoriaData, updateVistoriaData, clearVistoriaData } = useVistoria();
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([
    {
      id: '1',
      name: 'Hodômetro',
      icon: 'speed',
      description: 'Tire uma foto do hodômetro',
      photo: null,
      apiKey: 'hodometro'
    },
    {
      id: '2',
      name: 'Interior Frontal',
      icon: 'dashboard',
      description: 'Tire uma foto do interior frontal do veículo',
      photo: null,
      apiKey: 'interior_frontal'
    },
    {
      id: '3',
      name: 'Interior Traseiro',
      icon: 'event-seat',
      description: 'Tire uma foto do interior traseiro do veículo',
      photo: null,
      apiKey: 'interior_traseiro'
    },
        {
      id: '4',
      name: 'Lateral Esquerda',
      icon: 'arrow-left',
      description: 'Tire uma foto do lado esquerdo do veículo',
      photo: null,
      apiKey: 'lateral_esquerda'
    },
    {
      id: '5',
      name: 'Traseira do Veículo',
      icon: 'camera-rear',
      description: 'Tire uma foto da traseira do veículo',
      photo: null,
      apiKey: 'traseira'
    },
    {
      id: '6',
      name: 'Lateral Direita',
      icon: 'arrow-right',
      description: 'Tire uma foto do lado direito do veículo',
      photo: null,
      apiKey: 'lateral_direita'
    },
        {
      id: '7',
      name: 'Frente do Veículo',
      icon: 'camera-front',
      description: 'Tire uma foto da frente do veículo',
      photo: null,
      apiKey: 'frente'
    },
    {
      id: '8',
      name: 'Motor',
      icon: 'engineering',
      description: 'Tire uma foto do motor do veículo',
      photo: null,
      apiKey: 'motor'
    },
  ]);

  const takePhoto = async (id: string) => {
    try {
      setSubmitting(true);
      const image = await ImagePicker.openCamera({
        width: 1080,
        height: 810,
        cropping: false,
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
        cropperChooseText: 'Confirmar',
      });

      setPhotos(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, photo: image.path }
            : item
        )
      );
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Erro ao tirar foto:', error);
        Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const retakePhoto = (id: string) => {
    setPhotos(prev =>
      prev.map(item =>
        item.id === id ? { ...item, photo: null } : item
      )
    );
  };

  const allPhotosTaken = photos.every(photo => photo.photo !== null);
  const photosTaken = photos.filter(photo => photo.photo !== null).length;
  const insets = useSafeAreaInsets();

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('Dados carregados do AsyncStorage:', savedData);

      if (savedData) {
        const parsedData = JSON.parse(savedData);

        if (parsedData.fotos) {
          console.log('Fotos carregadas do AsyncStorage:', parsedData.fotos);
          setPhotos(prev =>
            prev.map(item => ({
              ...item,
              photo: parsedData.fotos[item.apiKey] || null
            }))
          );
        }

        updateVistoriaData(parsedData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do AsyncStorage:', error);
    }
  };

  useEffect(() => {
    loadSavedData();
  }, []);

  useEffect(() => {
    const savePhotos = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        const parsedExistingData = savedData ? JSON.parse(savedData) : {};

        const photosData = {
          hodometro: photos.find(p => p.apiKey === 'hodometro')?.photo || '',
          frente: photos.find(p => p.apiKey === 'frente')?.photo || '',
          traseira: photos.find(p => p.apiKey === 'traseira')?.photo || '',
          lateral_esquerda: photos.find(p => p.apiKey === 'lateral_esquerda')?.photo || '',
          lateral_direita: photos.find(p => p.apiKey === 'lateral_direita')?.photo || '',
          interior_frontal: photos.find(p => p.apiKey === 'interior_frontal')?.photo || '',
          interior_traseiro: photos.find(p => p.apiKey === 'interior_traseiro')?.photo || '',
          motor: photos.find(p => p.apiKey === 'motor')?.photo || ''
        };

        const dataToSave = {
          ...parsedExistingData,
          fotos: photosData
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

        await updateVistoriaData(dataToSave);
      } catch (error) {
        console.error('Erro ao salvar fotos no AsyncStorage:', error);
      }
    };

    savePhotos();
  }, [photos]);

  const handleSubmit = async () => {
    if (!allPhotosTaken) return;

    setSubmitting(true);
    try {
      // Prepara as fotos no formato correto do VistoriaData
      const photosData = {
        hodometro: photos.find(p => p.apiKey === 'hodometro')?.photo || '',
        frente: photos.find(p => p.apiKey === 'frente')?.photo || '',
        traseira: photos.find(p => p.apiKey === 'traseira')?.photo || '',
        lateral_esquerda: photos.find(p => p.apiKey === 'lateral_esquerda')?.photo || '',
        lateral_direita: photos.find(p => p.apiKey === 'lateral_direita')?.photo || '',
        interior_frontal: photos.find(p => p.apiKey === 'interior_frontal')?.photo || '',
        interior_traseiro: photos.find(p => p.apiKey === 'interior_traseiro')?.photo || '',
        motor: photos.find(p => p.apiKey === 'motor')?.photo || ''
      };

      // Atualiza mantendo os dados existentes
      const newData = {
        ...vistoriaData,
        fotos: photosData,
      };

      // Salva no AsyncStorage
      await updateVistoriaData(newData);

      console.log('newData', newData);

      setCurrentStep(6);
    } catch (error: any) {
      console.error('Erro ao salvar fotos:', error);
      Alert.alert('Erro', 'Não foi possível salvar as fotos. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPhotoGuide = (id: string) => {
    switch (id) {
      case '1': // Hodômetro
        return {
          icon: 'speed',
          text: 'Centralize o painel do veículo',
          overlay: 'dashboard'
        };
      case '2': // Frente
        return {
          icon: 'camera-front',
          text: 'Centralize a frente do veículo',
          overlay: 'front'
        };
      case '3': // Traseira
        return {
          icon: 'camera-rear',
          text: 'Centralize a traseira do veículo',
          overlay: 'rear'
        };
      case '4': // Lateral Esquerda
        return {
          icon: 'arrow-left',
          text: 'Capture todo o lado esquerdo',
          overlay: 'left'
        };
      case '5': // Lateral Direita
        return {
          icon: 'arrow-right',
          text: 'Capture todo o lado direito',
          overlay: 'right'
        };
      case '6': // Interior Frontal
        return {
          icon: 'dashboard',
          text: 'Capture o interior frontal do veículo',
          overlay: 'interior_front'
        };
      case '7': // Interior Traseiro
        return {
          icon: 'event-seat',
          text: 'Capture o interior traseiro do veículo',
          overlay: 'interior_rear'
        };
      case '8': // Motor
        return {
          icon: 'engineering',
          text: 'Capture o motor do veículo',
          overlay: 'engine'
        };
      default:
        return {
          icon: 'camera',
          text: 'Tire a foto',
          overlay: 'front'
        };
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 + insets.top, paddingBottom: 100 + insets.bottom }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setCurrentStep(4)} className="w-8">
            <Icon name="chevron-left" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator currentStep={currentStep} totalSteps={6} />
          </View>
        </View>

        {/* Título e Descrição */}
        <View className="items-center space-y-3 mb-6 mt-4">
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Fotos do Veículo
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Tire fotos de todos os ângulos do veículo
          </Text>
          <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
            <Icon name="photo-camera" size={20} color="#004F9F" />
            <Text className="text-blue-600 ml-2 font-medium">
              {photosTaken} de {photos.length} fotos tiradas
            </Text>
          </View>
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
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute',
        bottom: insets.bottom + 16,
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
            onPress={handleSubmit}
            disabled={!allPhotosTaken || submitting}
            className={!allPhotosTaken || submitting ? 'opacity-50' : ''}
          >
            <View className="flex-row items-center justify-center py-4">
              <Text className="text-white text-lg font-semibold">
                {submitting ? 'Enviando...' : allPhotosTaken ? 'Continuar' : `${photosTaken} de ${photos.length} fotos`}
              </Text>
              {allPhotosTaken && !submitting && (
                <Icon name="check-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Loading Overlay */}
      {submitting && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white p-6 rounded-xl items-center">
            <ActivityIndicator size="large" color="#004F9F" />
            <Text className="text-gray-800 mt-4">Processando foto...</Text>
          </View>
        </View>
      )}
    </View>
  );
}