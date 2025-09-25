import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStep } from '../context/StepContext';
import { useVistoria, VistoriaData } from '../context/VistoriaContext';
import { StepIndicator } from '../components/StepIndicator';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from "@env";

const STORAGE_KEY = '@vistoria_data';

type Status = 'conforme' | 'nao_conforme' | 'nao_aplicavel';

interface ChecklistItem {
  id: string;
  name: string;
  icon: string;
  status: Status | null;
  description: string;
  apiKey: string;
}

export default function Step3() {
  const { currentStep, setCurrentStep } = useStep();
  const { vistoriaData, updateVistoriaData } = useVistoria();
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: '1',
      name: 'Travas elétricas',
      icon: 'lock',
      status: null,
      description: 'Teste o funcionamento das travas elétricas',
      apiKey: 'travas'
    },
    {
      id: '2', 
      name: 'Alarme',
      icon: 'notifications',
      status: null,
      description: 'Verifique se o alarme está funcionando',
      apiKey: 'alarme'
    },
    {
      id: '3',
      name: 'Buzina',
      icon: 'volume-up',
      status: null, 
      description: 'Teste o funcionamento da buzina',
      apiKey: 'buzina'
    },
    {
      id: '4',
      name: 'Limpador de para-brisa',
      icon: 'clean',
      status: null,
      description: 'Verifique o funcionamento dos limpadores',
      apiKey: 'limpador'
    },
    {
      id: '5',
      name: 'Bateria',
      icon: 'battery-full',
      status: null,
      description: 'Verifique o estado da bateria',
      apiKey: 'bateria'
    },
    {
      id: '6',
      name: 'Cintos de segurança',
      icon: 'event-seat',
      status: null,
      description: 'Teste o travamento e retorno dos cintos',
      apiKey: 'cintos'
    },
    {
      id: '7',
      name: 'Triângulo',
      icon: 'warning',
      status: null,
      description: 'Verifique se o triângulo está presente e em bom estado',
      apiKey: 'triangulo'
    },
    {
      id: '8',
      name: 'Macaco',
      icon: 'build',
      status: null,
      description: 'Confirme se o macaco está presente e funcionando',
      apiKey: 'macaco'
    },
    {
      id: '9',
      name: 'Chave de Roda',
      icon: 'settings',
      status: null,
      description: 'Verifique se a chave de roda está presente',
      apiKey: 'chave_roda'
    },
    {
      id: '10',
      name: 'CRLV',
      icon: 'description',
      status: null,
      description: 'Verifique se o documento está atualizado e legível',
      apiKey: 'crlv'
    }
  ]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.checklist) {
          setChecklist(prev => 
            prev.map(item => ({
              ...item,
              status: parsedData.checklist[item.apiKey] === 'conforme' || parsedData.checklist[item.apiKey] === 'nao_conforme' 
                ? parsedData.checklist[item.apiKey] 
                : null
            }))
          );
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do AsyncStorage:', error);
    }
  };

  const updateStatus = (id: string, newStatus: Status | null) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleSubmit = async () => {
    if (!allItemsChecked) return;

    setSubmitting(true);
    try {
      // Prepara o novo checklist no formato do AsyncStorage
      const newChecklist = checklist.reduce((acc, item) => ({
        ...acc,
        [item.apiKey]: item.status || 'nao_aplicavel'
      }), {}) as VistoriaData['checklist'];

      // Atualiza os dados no AsyncStorage
      const newData = { 
        ...vistoriaData, 
        checklist: newChecklist
      };

      console.log('newData', newData);
      await updateVistoriaData(newData);
      setCurrentStep(3);

    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados do checklist. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: Status | null) => {
    if (status === 'conforme') return '#10B981';
    if (status === 'nao_conforme') return '#EF4444';
    return '#9CA3AF';
  };

  const getStatusBackground = (status: Status | null) => {
    if (status === 'conforme') return '#D1FAE5';
    if (status === 'nao_conforme') return '#FEE2E2';
    return '#F9FAFB';
  };

  const allItemsChecked = checklist.every(item => 
    item.status === 'conforme' || item.status === 'nao_conforme'
  );
  
  const itemsChecked = checklist.filter(item => 
    item.status === 'conforme' || item.status === 'nao_conforme'
  ).length;

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 + insets.top, paddingBottom: 100 + insets.bottom }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => setCurrentStep(1)} className="w-8">
            <Icon name="chevron-left" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator currentStep={currentStep} totalSteps={6} />
          </View>
        </View>

        <View className="items-center space-y-3 mb-4 mt-4">
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Checklist de Segurança
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Verifique cada item e marque o status correspondente
          </Text>
          <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
            <Icon name="check-circle" size={20} color="#004F9F" />
            <Text className="text-blue-600 ml-2 font-medium">
              {itemsChecked} de {checklist.length} itens verificados
            </Text>
          </View>
        </View>

        {/* Legenda dos Status */}
        <View className="flex-row justify-center items-center gap-4 mb-4 bg-gray-50/50 py-3 px-6 rounded-lg">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center">
              <Icon name="check-circle" size={18} color="#10B981" />
            </View>
            <Text className="text-sm text-gray-700">Conforme</Text>
          </View>
          <View className="w-px h-6 bg-gray-200" />
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center">
              <Icon name="cancel" size={18} color="#EF4444" />
            </View>
            <Text className="text-sm text-gray-700">Não Conforme</Text>
          </View>
        </View>

        {/* Checklist */}
        <View className="gap-4">
          {checklist.map((item) => (
            <View 
              key={item.id} 
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <View className="flex-row w-full py-4 px-2 items-center">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-start">
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                      <Icon name={item.icon} size={24} color={getStatusColor(item.status)} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900">{item.name}</Text>
                      <Text className="text-sm text-gray-500 mt-1 pr-4">{item.description}</Text>
                    </View>
                  </View>
                </View>

                {/* Botões de Status */}
                <View className="flex-row justify-end space-x-2 gap-2">
                  <TouchableOpacity
                    onPress={() => updateStatus(item.id, 'conforme')}
                    className={`w-12 h-12 rounded-full items-center justify-center ${
                      item.status === 'conforme' ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon name="check-circle" size={24} color={item.status === 'conforme' ? '#10B981' : '#9CA3AF'} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => updateStatus(item.id, 'nao_conforme')}
                    className={`w-12 h-12 rounded-full items-center justify-center ${
                      item.status === 'nao_conforme' ? 'bg-red-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon name="cancel" size={24} color={item.status === 'nao_conforme' ? '#EF4444' : '#9CA3AF'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra de Status */}
              <View 
                className="h-1 w-full" 
                style={{ 
                  backgroundColor: getStatusBackground(item.status),
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
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
            disabled={!allItemsChecked || submitting}
            className={!allItemsChecked || submitting ? 'opacity-50' : ''}
          >
            <View className="flex-row items-center justify-center py-4">
              <Text className="text-white text-lg font-semibold">
                {submitting ? 'Enviando...' : allItemsChecked ? 'Continuar' : `${itemsChecked} de ${checklist.length} itens`}
              </Text>
              {allItemsChecked && !submitting && (
                <Icon name="check-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />
              )}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
} 