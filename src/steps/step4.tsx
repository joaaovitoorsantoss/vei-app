import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator, PanResponder, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStep } from '../context/StepContext';
import { useVistoria, VistoriaData } from '../context/VistoriaContext';
import { StepIndicator } from '../components/StepIndicator';
import { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vistoria_data';

type Rating = 0 | 1 | 2 | 3 | 4 | 5;

interface EstadoItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  rating: Rating;
  apiKey: string;
}

export default function Step4() {
  const { currentStep, setCurrentStep } = useStep();
  const { vistoriaData, updateVistoriaData } = useVistoria();
  const [submitting, setSubmitting] = useState(false);
  const [estadoItems, setEstadoItems] = useState<EstadoItem[]>([
    {
      id: '1',
      name: 'Limpeza',
      icon: 'car-wash',
      description: 'Avalie a limpeza do veículo',
      rating: 0,
      apiKey: 'limpeza'
    },
    {
      id: '2',
      name: 'Manutenção',
      icon: 'wrench',
      description: 'Avalie a manutenção',
      rating: 0,
      apiKey: 'manutencao'
    },
    {
      id: '3',
      name: 'Pintura',
      icon: 'format-paint',
      description: 'Verifique a condição da pintura',
      rating: 0,
      apiKey: 'pintura'
    },
    {
      id: '4',
      name: 'Vidros',
      icon: 'window-closed',
      description: 'Avalie o estado dos vidros',
      rating: 0,
      apiKey: 'vidros'
    },
    {
      id: '5',
      name: 'Estofados',
      icon: 'car-seat',
      description: 'Verifique o estado dos estofados',
      rating: 0,
      apiKey: 'estofados'
    },  
    {
      id: '9',
      name: 'Retrovisores',
      icon: 'mirror',
      description: 'Verifique o estado dos retrovisores',
      rating: 0,
      apiKey: 'retrovisores'
    }
  ]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.avaliacoes) {
          setEstadoItems(prev =>
            prev.map(item => ({
              ...item,
              rating: parsedData.avaliacoes[item.apiKey] || 0
            }))
          );
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const updateRating = (id: string, newRating: Rating) => {
    setEstadoItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, rating: newRating } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!allItemsRated) return;

    setSubmitting(true);
    try {
      // Prepara as avaliações no formato do AsyncStorage
      const newAvaliacoes = estadoItems.reduce((acc, item) => ({
        ...acc,
        [item.apiKey]: item.rating
      }), {} as VistoriaData['avaliacoes']);

      // Atualiza os dados no AsyncStorage
      const newData = { 
        ...vistoriaData, 
        avaliacoes: newAvaliacoes
      };
      console.log('newData', newData);
      await updateVistoriaData(newData);
      setCurrentStep(4);

    } catch (error) {
      console.error('Erro ao salvar avaliações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as avaliações. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingColor = (rating: Rating) => {
    switch (rating) {
      case 0:
        return '#9CA3AF'; // Cinza para não avaliado
      case 5:
        return '#34D399'; // Verde mais opaco
      case 4:
        return '#60A5FA'; // Azul mais opaco
      case 3:
        return '#FBBF24'; // Laranja mais opaco
      case 2:
        return '#F87171'; // Vermelho mais opaco
      case 1:
        return '#EF4444'; // Vermelho escuro mais opaco
      default:
        return '#6B7280';
    }
  };

  const getRatingText = (rating: Rating) => {
    switch (rating) {
      case 0:
        return 'Não Avaliado';
      case 5:
        return 'Excelente';
      case 4:
        return 'Muito Bom';
      case 3:
        return 'Bom';
      case 2:
        return 'Regular';
      case 1:
        return 'Ruim';
      default:
        return '';
    }
  };

  const getRatingDescription = (rating: Rating) => {
    switch (rating) {
      case 0:
        return 'Toque nas estrelas para avaliar';
      case 5:
        return 'Estado perfeito, sem danos';
      case 4:
        return 'Pequenos detalhes, mas em ótimo estado';
      case 3:
        return 'Alguns danos, mas em bom estado';
      case 2:
        return 'Danos visíveis que precisam de atenção';
      case 1:
        return 'Danos graves que precisam de reparo';
      default:
        return '';
    }
  };

  const insets = useSafeAreaInsets();
  const allItemsRated = estadoItems.every(item => item.rating > 0);
  const unratedItems = estadoItems.filter(item => item.rating === 0).length;

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 + insets.top, paddingBottom: 100 + insets.bottom }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setCurrentStep(2)} className="w-8">
            <Icon name="chevron-left" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator currentStep={Number(currentStep)} totalSteps={6} />
          </View>
        </View>

        {/* Título e Descrição */}
        <View className="items-center space-y-3 mb-8 mt-4">
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Condição Geral
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Avalie o estado geral do veículo
          </Text>
          <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
            <Icon name="information" size={20} color="#004F9F" />
            <Text className="text-blue-600 ml-2 font-medium">
              Toque nas estrelas para avaliar cada item
            </Text>
          </View>
        </View>

        {/* Lista de Avaliações */}
        <View className="gap-3">
          {estadoItems.map((item) => (
            <View
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center mr-3">
                      <Icon name={item.icon} size={22} color="#004F9F" />
                    </View>
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-medium text-gray-900">{item.name}</Text>
                      <Text className="text-sm text-gray-500">{item.description}</Text>
                    </View>
                  </View>

                  <Text className="text-sm font-medium text-right" style={{ color: getRatingColor(item.rating) }}>
                    {getRatingText(item.rating)}
                  </Text>
                </View>

                {/* Estrelas de Avaliação */}
                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        className="p-1.5 -mx-0.5"
                        onPress={() => updateRating(item.id, star as Rating)}
                        activeOpacity={0.7}
                      >
                        <Icon
                          name={star <= item.rating ? 'star' : 'star-outline'}
                          size={28}
                          color={star <= item.rating ? getRatingColor(item.rating) : '#D1D5DB'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <Text className="text-xs text-gray-400 flex-shrink ml-2 text-right">
                    {getRatingDescription(item.rating)}
                  </Text>
                </View>
              </View>

              {/* Barra de Status */}
              <View
                className="h-0.5 w-full"
                style={{
                  backgroundColor: getRatingColor(item.rating),
                  opacity: 0.2,
                }}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Botão Continuar */}
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
            disabled={!allItemsRated || submitting}
            className={!allItemsRated || submitting ? 'opacity-50' : ''}
          >
            <View className="flex-row items-center justify-center py-4">
              <Text className="text-white text-lg font-semibold">
                {submitting ? 'Enviando...' : !allItemsRated ? `Faltam ${unratedItems} itens` : 'Continuar'}
              </Text>
              {allItemsRated && !submitting && (
                <Icon name="check-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
} 