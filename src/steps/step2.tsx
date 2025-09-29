import { View, Text, TextInput, Image, Dimensions, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStep } from '../context/StepContext';
import { useVistoria } from '../context/VistoriaContext';
import { StepIndicator } from '../components/StepIndicator';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keyboard } from 'react-native';
import axios from 'axios';
import { API_URL } from '@env';

interface Frota {
  id: number;
  modelo: string;
  ano: number;
  placa: string;
}

interface Colaborador {
  id: number;
  nome: string;
  matricula: string;
}

export default function Step2() {
  const { currentStep, setCurrentStep } = useStep();
  const { vistoriaData, updateVistoriaData, clearVistoriaData, saveVistoriaId, loadVistoriaData, hasVistoria } = useVistoria();
  const [showFrotaModal, setShowFrotaModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [frotas, setFrotas] = useState<Frota[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [matricula, setMatricula] = useState<string>('');
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [buscandoColaborador, setBuscandoColaborador] = useState(false);
  const [colaboradorEncontrado, setColaboradorEncontrado] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const safeMatricula = matricula ? matricula.toString() : '';
  const finalMatricula = safeMatricula || (vistoriaData.matricula ? vistoriaData.matricula.toString() : '') || '';
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchingFrotas, setSearchingFrotas] = useState(false);

  const loadFrotas = async (reset = false, searchTerm = '') => {
    if (loading || loadingMore) return;

    if (reset) {
      setPage(1);
      setHasMore(true);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await axios.get(`${API_URL}/frota/paginated`, {
        params: { page: reset ? 1 : page, limit: 10, search: searchTerm || undefined },
      });

      const newFrotas = response.data.veiculos;

      setFrotas((prev) => {
        if (reset) return newFrotas;

        return [
          ...prev,
          ...newFrotas.filter((n: any) => !prev.some((p) => p.id === n.id)),
        ];
      });

      if (page >= response.data.totalPages || newFrotas.length === 0) {
        setHasMore(false);
      } else if (reset) {
        setPage(2);
      } else {
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Erro ao carregar frotas:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Função debounced para busca
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    setSearchingFrotas(true);

    const timeout = setTimeout(() => {
      loadFrotas(true, searchTerm);
      setSearchingFrotas(false);
    }, 300); // 300ms de delay para uma resposta mais rápida

    setSearchTimeout(timeout);
  }, [searchTimeout, loading, loadingMore]);

  useEffect(() => {
    const loadVistoriaDataIfExists = async () => {
      try {
        if (await hasVistoria()) {
          await loadVistoriaData();
          setTimeout(() => {
            if (vistoriaData.nome && vistoriaData.matricula) {
              setColaboradorEncontrado(true);
              setMatricula(vistoriaData.matricula);
              setColaborador({
                id: 0,
                nome: vistoriaData.nome,
                matricula: vistoriaData.matricula
              });
            }
          }, 500);
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os dados da vistoria. Tente novamente.');
      }
    };

    loadVistoriaDataIfExists();
    loadFrotas(true, '');
  }, []);

  useEffect(() => {
    if (vistoriaData.nome && vistoriaData.matricula && !colaboradorEncontrado) {
      setColaboradorEncontrado(true);
      setMatricula(vistoriaData.matricula);
      setColaborador({
        id: 0,
        nome: vistoriaData.nome,
        matricula: vistoriaData.matricula
      });
    }
  }, [vistoriaData, colaboradorEncontrado]);

  useEffect(() => {
    if (vistoriaData.matricula && !matricula && !isUserTyping) {
      setMatricula(vistoriaData.matricula);
    }
  }, [vistoriaData.matricula, matricula, isUserTyping]);

  useEffect(() => {
    const loadMatriculaFromContext = () => {
      if (vistoriaData.matricula && vistoriaData.matricula !== matricula && !isUserTyping) {
        setMatricula(vistoriaData.matricula);
      }
    };

    loadMatriculaFromContext();

    const timer = setTimeout(loadMatriculaFromContext, 100);

    return () => clearTimeout(timer);
  }, [vistoriaData.matricula, matricula, isUserTyping]);

  useEffect(() => {
    const checkSavedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem('@vistoria_data');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.matricula && !matricula && !isUserTyping) {
            setMatricula(parsedData.matricula);
            if (parsedData.nome) {
              setColaboradorEncontrado(true);
              setColaborador({
                id: 0,
                nome: parsedData.nome,
                matricula: parsedData.matricula
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar dados salvos:', error);
      }
    };

    checkSavedData();
  }, [matricula, isUserTyping]);

  useEffect(() => {
    const loadInitialMatricula = async () => {
      try {
        const savedData = await AsyncStorage.getItem('@vistoria_data');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.matricula && !matricula) {
            setMatricula(parsedData.matricula);
            if (parsedData.nome) {
              setColaboradorEncontrado(true);
              setColaborador({
                id: 0,
                nome: parsedData.nome,
                matricula: parsedData.matricula
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro no carregamento inicial:', error);
      }
    };

    loadInitialMatricula();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      scrollViewRef.current?.scrollTo({ y: 50, animated: true });
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Cleanup do timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const buscarColaborador = async (matriculaDigitada: string) => {
    if (!matriculaDigitada || !matriculaDigitada.trim()) {
      setColaborador(null);
      setColaboradorEncontrado(false);
      updateVistoriaData({ nome: '', matricula: '' });
      return;
    }

    setBuscandoColaborador(true);
    try {
      const matriculaLimpa = matriculaDigitada.trim();
      const response = await axios.get(`${API_URL}/colaborador?matricula=${matriculaLimpa}`);

      if (response.data && response.data.length > 0) {
        const colaboradorEncontrado = response.data[0];
        setColaborador(colaboradorEncontrado);
        setColaboradorEncontrado(true);
        console.log('Salvando colaborador:', colaboradorEncontrado);
        updateVistoriaData({
          nome: colaboradorEncontrado.nome,
          matricula: colaboradorEncontrado.matricula
        });
      } else {
        setColaborador(null);
        setColaboradorEncontrado(false);
        updateVistoriaData({ nome: '', matricula: '' });
        Alert.alert('Colaborador não encontrado', 'Nenhum colaborador encontrado com esta matrícula.');
      }
    } catch (error) {
      console.error('Erro ao buscar colaborador:', error);
      setColaborador(null);
      setColaboradorEncontrado(false);
      updateVistoriaData({ nome: '', matricula: '' });
      Alert.alert('Erro', 'Erro ao buscar colaborador. Verifique sua conexão e tente novamente.');
    } finally {
      setBuscandoColaborador(false);
    }
  };

  const handleMatriculaChange = (text: string) => {
    const textValue = text || '';
    setIsUserTyping(true);
    setMatricula(textValue);

    if (!textValue || !textValue.trim()) {
      setColaborador(null);
      setColaboradorEncontrado(false);
      updateVistoriaData({ nome: '', matricula: '' });
    }
  };

  const handleMatriculaSubmit = () => {
    setIsUserTyping(false);
    if (safeMatricula && safeMatricula.trim()) {
      buscarColaborador(safeMatricula);
    }
  };

  const handleSubmit = async () => {
    if (!finalMatricula || !finalMatricula.trim() || !colaboradorEncontrado) {
      Alert.alert('Matrícula obrigatória', 'Digite uma matrícula válida para continuar.');
      return;
    }

    if (!isFormValid) return;

    setSubmitting(true);
    try {
      const existingVistoriaId = await AsyncStorage.getItem('@vistoria_id');
      const vistoriaId = existingVistoriaId ? parseInt(existingVistoriaId) : Date.now();

      const newData: typeof vistoriaData = {
        ...vistoriaData,
        nome: vistoriaData.nome.trim(),
        matricula: vistoriaData.matricula,
        frota: vistoriaData.frota,
        placa: frotas[0]?.placa || '',
        modelo: frotas[0]?.modelo || '',
        quilometragem: parseInt(vistoriaData.quilometragem.toString()) || 0,
        status: 'em_andamento' as const,
        data_criacao: vistoriaData.data_criacao || new Date().toISOString()
      };

      await updateVistoriaData(newData);

      if (!existingVistoriaId) {
        await saveVistoriaId(vistoriaId);
      }

      setCurrentStep(2);

    } catch (error) {
      console.error('Erro ao salvar vistoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados da vistoria. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = colaboradorEncontrado &&
    (vistoriaData?.frota || '') !== '' &&
    (vistoriaData?.quilometragem || 0) > 0;

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 18 + insets.top,
            // paddingBottom: 100 + insets.bottom
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setCurrentStep(0)} className="w-8">
              <Icon name="chevron-left" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View className="absolute left-1/2 -translate-x-1/2">
              <StepIndicator currentStep={Number(currentStep)} totalSteps={6} />
            </View>
          </View>

          <View className="items-center space-y-3 mb-8 mt-4">
            <Text className="text-3xl font-bold text-gray-900 text-center">
              Informações do Veículo
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Preencha os dados do veículo para iniciar a vistoria
            </Text>
            <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
              <Icon name="info" size={20} color="#004F9F" />
              <Text className="text-blue-600 ml-2 font-medium">
                Digite sua matrícula para continuar
              </Text>
            </View>
          </View>

          <View className="space-y-4 mb-8">
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Matrícula</Text>
              <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white">
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                  <Icon name="badge" size={20} color="#004F9F" />
                </View>
                <TextInput
                  className="flex-1 text-base text-gray-900"
                  placeholder="Digite sua matrícula"
                  placeholderTextColor="#9CA3AF"
                  value={finalMatricula}
                  onChangeText={handleMatriculaChange}
                  onSubmitEditing={handleMatriculaSubmit}
                  onBlur={() => setIsUserTyping(false)}
                  returnKeyType="search"
                  keyboardType="numeric"
                  editable={!buscandoColaborador}
                />
                {buscandoColaborador && (
                  <ActivityIndicator size="small" color="#004F9F" />
                )}
                {!buscandoColaborador && safeMatricula && safeMatricula.trim() && (
                  <TouchableOpacity onPress={handleMatriculaSubmit}>
                    <Icon name="search" size={20} color="#004F9F" />
                  </TouchableOpacity>
                )}
              </View>
              {colaboradorEncontrado && colaborador && (
                <View className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <View className="flex-row items-center">
                    <Icon name="check-circle" size={20} color="#10B981" />
                    <Text className="text-green-800 ml-2 font-medium">
                      {colaborador.nome}
                    </Text>
                  </View>
                  <Text className="text-green-600 text-sm ml-6">
                    Matrícula: {colaborador.matricula}
                  </Text>
                </View>
              )}
            </View>

            {colaboradorEncontrado && (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Frota</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowFrotaModal(true)
                      Keyboard.dismiss();
                    }}
                    className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white"
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                      <Icon name="directions-car" size={20} color="#004F9F" />
                    </View>
                    <View className="flex-1 justify-center min-h-[24px]">
                      <Text className={`text-base ${vistoriaData.frota ? 'text-gray-900' : 'text-gray-400'}`}>
                        {vistoriaData.frota ? `${vistoriaData.frota}` : 'Selecione uma frota'}
                      </Text>
                      {vistoriaData.frota ? (
                        <Text className="text-sm text-gray-500">
                          {vistoriaData.placa} - {vistoriaData.modelo?.toUpperCase()}
                        </Text>
                      ) : (
                        <Text className="text-sm text-gray-500">
                          Toque para selecionar a frota
                        </Text>
                      )}
                    </View>
                    <Icon name="arrow-drop-down" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Quilometragem</Text>
                  <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white">
                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                      <Icon name="speed" size={20} color="#004F9F" />
                    </View>
                    <TextInput
                      className="flex-1 text-base text-gray-900"
                      placeholder="Digite a quilometragem atual"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={vistoriaData?.quilometragem?.toString() || '0'}
                      onChangeText={(text) => updateVistoriaData({ quilometragem: parseInt(text) || 0 })}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 200);
                      }}
                    />
                    <Text className="text-gray-500 ml-2">km</Text>
                  </View>
                </View>
              </>

            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {!isKeyboardVisible && (
        <View style={{ position: 'absolute', bottom: insets.bottom + 16, width: '90%', display: 'flex', justifyContent: 'center', alignSelf: 'center' }}>
          <LinearGradient colors={['#004F9F', '#009FE3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={!isFormValid || submitting}
              className={!isFormValid || submitting ? 'opacity-50' : ''}
            >
              <View className="flex-row items-center justify-center py-4">
                <Text className="text-white text-lg font-semibold">
                  {submitting ? 'Enviando...' : isFormValid ? 'Continuar' : 'Digite sua matrícula primeiro'}
                </Text>
                {isFormValid && !submitting && <Icon name="check-circle" size={24} color="#fff" style={{ marginLeft: 8 }} />}
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      <Modal visible={showFrotaModal} transparent animationType="slide" onRequestClose={() => setShowFrotaModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 h-[80%]"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Selecione a Frota</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity onPress={() => loadFrotas(true, searchQuery)} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="large" color="#004F9F" />
                  ) : (
                    <Icon name="refresh" size={24} color={loading ? "#9CA3AF" : "#004F9F"} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowFrotaModal(false)}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white mb-4">
              <Icon name="search" size={20} color="#6B7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-base text-gray-900"
                placeholder="Pesquisar por frota, modelo ou placa..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={(text) => { 
                  setSearchQuery(text); 
                  debouncedSearch(text);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { 
                  setSearchQuery(''); 
                  setSearchingFrotas(false);
                  if (searchTimeout) clearTimeout(searchTimeout);
                  loadFrotas(true, '');
                }}>
                  <Icon name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={frotas}
              // keyExtractor={(item, index) => `${item.id}-${item.placa}-${index}`}
              keyExtractor={(item, index) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    updateVistoriaData({ frota: item.id.toString(), placa: item.placa, modelo: item.modelo });
                    setShowFrotaModal(false);
                    setSearchQuery('');
                    Keyboard.dismiss();
                  }}
                  className="py-4 border-b border-gray-100"
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-base font-medium text-gray-900">
                        {item.id} - {item.modelo.toUpperCase()}
                      </Text>
                      <Text className="text-sm text-gray-500">{item.placa}</Text>
                    </View>
                    {vistoriaData.frota === item.id.toString() && <Icon name="check-circle" size={24} color="#10B981" />}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text className="text-center text-gray-500 py-4">Nenhuma frota encontrada</Text>}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              onEndReached={() => { if (hasMore) loadFrotas(false, searchQuery); }}
              onEndReachedThreshold={0.3}
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}