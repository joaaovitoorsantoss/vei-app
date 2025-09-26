import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStep } from '../context/StepContext';
import { useVistoria, VistoriaData } from '../context/VistoriaContext';
import { StepIndicator } from '../components/StepIndicator';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

const STORAGE_KEY = '@vistoria_data';

type Rating = 'nao_avaliado' | 'conforme' | 'nao_conforme';

interface EstadoItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  rating: Rating;
  apiKey: string;
  category: string;
}

export default function Step5() {
  const { currentStep, setCurrentStep } = useStep();
  const { vistoriaData, updateVistoriaData } = useVistoria();
  const [submitting, setSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Pneus': true // Primeiro accordion sempre ativo
  });
  const [selectedItem, setSelectedItem] = useState<EstadoItem | null>(null);
  const [estadoItems, setEstadoItems] = useState<EstadoItem[]>([
    {
      id: '1',
      name: 'Pneus Dianteiros',
      icon: 'tire',
      description: 'Verifique o estado dos pneus dianteiros',
      rating: 'nao_avaliado',
      apiKey: 'pneus_dianteiros',
      category: 'Pneus'
    },
    {
      id: '2',
      name: 'Pneus Traseiros',
      icon: 'tire',
      description: 'Verifique o estado dos pneus traseiros',
      rating: 'nao_avaliado',
      apiKey: 'pneus_traseiros',
      category: 'Pneus'
    },
    {
      id: '3',
      name: 'Pneu Estepe',
      icon: 'tire',
      description: 'Verifique o estado do pneu estepe',
      rating: 'nao_avaliado',
      apiKey: 'pneu_estepe',
      category: 'Pneus'
    },
    {
      id: '4',
      name: 'Faróis',
      icon: 'car-light-high',
      description: 'Verifique o funcionamento dos faróis',
      rating: 'nao_avaliado',
      apiKey: 'farois',
      category: 'Luzes'
    },
    {
      id: '5',
      name: 'Lanternas',
      icon: 'car-parking-lights',
      description: 'Verifique o funcionamento das lanternas',
      rating: 'nao_avaliado',
      apiKey: 'lanternas',
      category: 'Luzes'
    },
    {
      id: '6',
      name: 'Luz de Freio',
      icon: 'car-brake-alert',
      description: 'Verifique o funcionamento da luz de freio',
      rating: 'nao_avaliado',
      apiKey: 'luz_freio',
      category: 'Luzes'
    },
    {
      id: '7',
      name: 'Piscas',
      icon: 'car-light-dimmed',
      description: 'Verifique o funcionamento dos piscas',
      rating: 'nao_avaliado',
      apiKey: 'piscas',
      category: 'Luzes'
    },
    {
      id: '8',
      name: 'Óleo do Motor',
      icon: 'oil',
      description: 'Verifique o nível do óleo do motor',
      rating: 'nao_avaliado',
      apiKey: 'oleo_motor',
      category: 'Fluidos'
    },
    {
      id: '9',
      name: 'Água do Radiador',
      icon: 'water',
      description: 'Verifique o nível da água do radiador',
      rating: 'nao_avaliado',
      apiKey: 'agua_radiador',
      category: 'Fluidos'
    },
    {
      id: '10',
      name: 'Óleo do Freio',
      icon: 'oil',
      description: 'Verifique o nível do óleo do freio',
      rating: 'nao_avaliado',
      apiKey: 'oleo_freio',
      category: 'Fluidos'
    }
  ]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (currentStep === 4 && mounted) {
        try {
          await loadSavedData();
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [currentStep]);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      const parsedData = JSON.parse(savedData);
      if (!parsedData.estado_tecnico) return;

      console.log('Dados do estado técnico do AsyncStorage:', parsedData.estado_tecnico);
      
      setEstadoItems(prev =>
        prev.map(item => ({
          ...item,
          rating: parsedData.estado_tecnico[item.apiKey] || 'nao_avaliado'
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar dados do AsyncStorage:', error);
      throw error;
    }
  };

  const updateRating = (id: string, newRating: Rating) => {
    try {
      setEstadoItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, rating: newRating } : item
        )
      );

      // Usa setTimeout para evitar bloqueio da UI
      setTimeout(() => {
        saveToAsyncStorage(id, newRating).catch(error => {
          console.error('Erro ao salvar avaliação:', error);
        });
      }, 0);
    } catch (error) {
      console.error('Erro ao atualizar rating:', error);
    }
  };

  const saveToAsyncStorage = async (id: string, newRating: Rating) => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      const parsedData = savedData ? JSON.parse(savedData) : {};
      
      const item = estadoItems.find(item => item.id === id);
      if (!item) return;

      const updatedEstadoTecnico = {
        ...(parsedData.estado_tecnico || {}),
        [item.apiKey]: newRating
      };

      const dataToSave = {
        ...parsedData,
        estado_tecnico: updatedEstadoTecnico
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Erro ao salvar no AsyncStorage:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      // Prepara as avaliações
      const newEstadoTecnico = estadoItems.reduce((acc, item) => {
        if (item.rating !== 'nao_avaliado') {
          acc[item.apiKey] = item.rating;
        }
        return acc;
      }, {} as VistoriaData['estado_tecnico']);

      // Atualiza os dados locais
      const newData = {
        ...vistoriaData,
        estado_tecnico: newEstadoTecnico,
      };

      console.log('newData', newData);
      await updateVistoriaData(newData);

      setCurrentStep(5);
    } catch (error) {
      console.error('Erro ao salvar avaliações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as avaliações. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const insets = useSafeAreaInsets();
  const unratedItems = estadoItems.filter(item => item.rating === 'nao_avaliado').length;

  const handleRatingPress = (item: EstadoItem, rating: Rating) => {
    updateRating(item.id, rating);
  };

  // Agrupa os itens por categoria
  const groupedItems = estadoItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EstadoItem[]>);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Pneus':
        return 'tire';
      case 'Luzes':
        return 'lightbulb-on';
      case 'Fluidos':
        return 'oil';
      default:
        return 'information';
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      // Fecha todos os outros accordions
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);
      
      // Abre apenas o accordion clicado
      newState[category] = !prev[category];
      return newState;
    });
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 + insets.top, paddingBottom: 100 + insets.bottom }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setCurrentStep(3)} className="w-8">
            <Icon name="chevron-left" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator currentStep={currentStep} totalSteps={6} />
          </View>
        </View>

        {/* Título e Descrição */}
        <View className="items-center space-y-3 mb-8 mt-4">
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Verificação do Veículo
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Verifique cada item do veículo e marque seu estado
          </Text>
          <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
            <Icon name="information" size={20} color="#004F9F" />
            <Text className="text-blue-600 ml-2 font-medium">
              Selecione o estado de cada item
            </Text>
          </View>
        </View>

        {/* Lista de Avaliações Agrupadas */}
        <View className="gap-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <View key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Cabeçalho da Categoria */}
              <TouchableOpacity
                onPress={() => toggleCategory(category)}
                className="flex-row items-center justify-between p-4 bg-gray-50"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                    <Icon name={getCategoryIcon(category)} size={24} color="#004F9F" />
                  </View>
                  <View>
                    <Text className="text-lg font-semibold text-gray-900">{category}</Text>
                    <Text className="text-sm text-gray-500">
                      {items.length} {items.length === 1 ? 'item' : 'itens'} para verificar
                    </Text>
                  </View>
                </View>
                <Icon
                  name={expandedCategories[category] ? "chevron-up" : "chevron-down"} 
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {/* Lista de Itens da Categoria */}
              {expandedCategories[category] && (
                <View className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <View key={item.id} className="p-4">
                      {/* Cabeçalho do Item */}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                            <Icon name={item.icon} size={20} color="#004F9F" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-medium text-gray-900">{item.name}</Text>
                            <Text className="text-sm text-gray-500">{item.description}</Text>
                          </View>
                        </View>
                        
                        {/* Botões de Avaliação */}
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            onPress={() => handleRatingPress(item, 'conforme')}
                            className={`w-10 h-10 rounded-full items-center justify-center ${
                              item.rating === 'conforme' ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <Icon 
                              name="check-circle" 
                              size={24} 
                              color={item.rating === 'conforme' ? '#34D399' : '#9CA3AF'} 
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleRatingPress(item, 'nao_conforme')}
                            className={`w-10 h-10 rounded-full items-center justify-center ${
                              item.rating === 'nao_conforme' ? 'bg-red-50' : 'bg-gray-50'
                            }`}
                          >
                            <Icon 
                              name="close-circle" 
                              size={24} 
                              color={item.rating === 'nao_conforme' ? '#EF4444' : '#9CA3AF'} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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
            disabled={submitting || unratedItems > 0}
            className={submitting || unratedItems > 0 ? 'opacity-50' : ''}
          >
            <View className="flex-row items-center justify-center py-4">
              <Text className="text-white text-lg font-semibold">
                {submitting ? 'Enviando...' : unratedItems > 0 ? `Faltam ${unratedItems} itens` : 'Continuar'}
              </Text>
              {!submitting && unratedItems === 0 && (
                <Icon name="check-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
} 