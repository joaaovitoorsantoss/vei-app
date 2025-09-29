import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
    Dimensions,
    Modal,
    FlatList,
    Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStep } from '../context/StepContext';
import { StepIndicator } from '../components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '@env';

const { width } = Dimensions.get('window');

interface Veiculo {
    id: number;
    modelo: string;
    ano: number;
    placa: string;
    marca: string;
    quilometragem: number;
    status: string;
    frota: string;
}

interface VistoriaRapida {
    tipo: 'retirada' | 'devolucao';
    veiculo_id: number;
    quilometragem: number;
    combustivel: 'cheio' | '3/4' | '1/2' | '1/4' | 'vazio' | null;
    estado_geral: 'otimo' | 'bom' | 'regular' | 'ruim' | null;
    observacoes: string;
    fotos: { [key: string]: string };
    colaborador: string;
}

export default function CheckIn() {
    const { setCurrentStep } = useStep();
    const insets = useSafeAreaInsets();

    const [currentStep, setCurrentCheckStep] = useState(1);
    const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
    const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
    const [tipoVistoria, setTipoVistoria] = useState<'retirada' | 'devolucao'>('retirada');
    const [quilometragem, setQuilometragem] = useState('');
    const [combustivel, setCombustivel] = useState<'cheio' | '3/4' | '1/2' | '1/4' | 'vazio' | null>(null);
    const [estadoGeral, setEstadoGeral] = useState<'otimo' | 'bom' | 'regular' | 'ruim' | null>(null);
    const [observacoes, setObservacoes] = useState('');
    const [colaborador, setColaborador] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [matriculaDigitada, setMatriculaDigitada] = useState('');
    const [exibindoNome, setExibindoNome] = useState(false);
    const [verificandoMatricula, setVerificandoMatricula] = useState(false);
    const [matriculaTimeout, setMatriculaTimeout] = useState<NodeJS.Timeout | null>(null);
    
    // Estados para o modal e busca de frota
    const [showFrotaModal, setShowFrotaModal] = useState(false);
    const [frotas, setFrotas] = useState<Veiculo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchingFrotas, setSearchingFrotas] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchVeiculos();
        loadFrotas(true, ''); // Carrega as frotas inicialmente

        return () => {
            if (matriculaTimeout) {
                clearTimeout(matriculaTimeout);
            }
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, []);

    const fetchVeiculos = async () => {
        try {
            const response = await axios.get(`${API_URL}/frota`);
            setVeiculos(response.data);
            setFrotas(response.data); // Também inicializa a lista para o modal
        } catch (error) {
            console.error('Erro ao carregar veículos:', error);
            Alert.alert('Erro', 'Erro ao carregar veículos. Tente novamente.');
        }
    };

    // Função para carregar frotas com paginação e busca
    const loadFrotas = async (reset = false, query = '') => {
        // Se não há query e já temos dados dos veículos, use os dados existentes
        if (!query && reset && veiculos.length > 0) {
            setFrotas(veiculos);
            setHasMore(false);
            setSearchingFrotas(false);
            return;
        }

        try {
            setSearchingFrotas(true);
            if (reset) setLoading(true);
            
            const response = await axios.get(`${API_URL}/frota`, {
                params: {
                    search: query,
                    page: reset ? 1 : Math.floor(frotas.length / 20) + 1,
                    limit: 20
                }
            });
            
            const newFrotas = response.data;
            
            if (reset) {
                setFrotas(newFrotas);
            } else {
                setFrotas(prev => [...prev, ...newFrotas]);
            }
            
            setHasMore(newFrotas.length === 20);
        } catch (error) {
            console.error('Erro ao carregar frotas:', error);
            Alert.alert('Erro', 'Erro ao carregar frotas. Tente novamente.');
        } finally {
            setLoading(false);
            setSearchingFrotas(false);
        }
    };

    // Função de busca com debounce
    const debouncedSearch = (query: string) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        setSearchingFrotas(true);
        const timeout = setTimeout(() => {
            loadFrotas(true, query);
        }, 500);
        
        setSearchTimeout(timeout);
    };

    const resetForm = () => {
        setCurrentCheckStep(1);
        setTipoVistoria('retirada');
        setSelectedVeiculo(null);
        setQuilometragem('');
        setCombustivel(null);
        setEstadoGeral(null);
        setObservacoes('');
        setColaborador('');
        setSuccess(false);
        setMatriculaDigitada('');
        setExibindoNome(false);
    };

    const handleSubmit = async () => {
        setLoading(true);

        try {
            if (!colaborador) {
                throw new Error('Por favor, preencha o nome do colaborador.');
            }
            if (!selectedVeiculo) {
                throw new Error('Por favor, selecione um veículo.');
            }
            if (!quilometragem) {
                throw new Error('Por favor, preencha a quilometragem.');
            }
            if (!combustivel) {
                throw new Error('Por favor, selecione o nível de combustível.');
            }
            if (!estadoGeral) {
                throw new Error('Por favor, selecione o estado geral do veículo.');
            }

            const vistoria: VistoriaRapida = {
                tipo: tipoVistoria,
                veiculo_id: selectedVeiculo.id,
                quilometragem: Number(quilometragem),
                combustivel,
                estado_geral: estadoGeral,
                observacoes,
                fotos: {},
                colaborador
            };

            const response = await axios.post(`${API_URL}/vistorias-rapidas`, vistoria);

            setSuccess(true);
        } catch (error: any) {
            console.error('Erro ao salvar vistoria:', error);
            Alert.alert('Erro', error.message || 'Erro ao salvar vistoria. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const validateStep = () => {
        switch (currentStep) {
            case 1:
                return true;
            case 3:
                if (!colaborador) {
                    Alert.alert('Atenção', 'Por favor, insira e valide sua matrícula primeiro.');
                    return false;
                }
                if (!selectedVeiculo) {
                    Alert.alert('Atenção', 'Por favor, selecione um veículo.');
                    return false;
                }
                if (!quilometragem) {
                    Alert.alert('Atenção', 'Por favor, preencha a quilometragem.');
                    return false;
                }
                return true;
            case 4:
                if (!combustivel) {
                    Alert.alert('Atenção', 'Por favor, selecione o nível de combustível.');
                    return false;
                }
                if (!estadoGeral) {
                    Alert.alert('Atenção', 'Por favor, selecione o estado geral do veículo.');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNextStep = () => {
        if (validateStep()) {
            setCurrentCheckStep(currentStep + 1);
        }
    };

    const verificarMatricula = async (matricula: string) => {
        if (matricula.length < 2) {
            setColaborador('');
            setExibindoNome(false);
            setVerificandoMatricula(false);
            return;
        }

        setVerificandoMatricula(true);

        try {
            const response = await axios.get(`${API_URL}/colaborador?matricula=${matricula}`);
            const data = response.data;

            if (data && data.length > 0 && data[0]) {
                const colaboradorEncontrado = data[0];
                const nome = colaboradorEncontrado.nome || colaboradorEncontrado.NOME;

                if (nome) {
                    Alert.alert('Sucesso', `Colaborador encontrado: ${nome}`);
                    setColaborador(nome);
                    setExibindoNome(true);
                } else {
                    Alert.alert('Aviso', 'Matrícula não encontrada');
                    setColaborador('');
                    setExibindoNome(false);
                }
            } else {
                setColaborador('');
                setExibindoNome(false);
                Alert.alert('Aviso', 'Matrícula não encontrada');
            }
        } catch (error) {
            console.error('Erro ao verificar matrícula:', error);
            setColaborador('');
            setExibindoNome(false);
            Alert.alert('Erro', 'Erro ao verificar matrícula');
        } finally {
            setVerificandoMatricula(false);
        }
    };

    const handleMatriculaChange = (valor: string) => {
        setMatriculaDigitada(valor);
        setExibindoNome(false);
        setColaborador('');

        if (!valor || valor.length < 2) {
            setSelectedVeiculo(null);
            setQuilometragem('');
        }

        if (matriculaTimeout) {
            clearTimeout(matriculaTimeout);
        }

        if (valor.length >= 2) {
            const timeout = setTimeout(() => {
                verificarMatricula(valor);
            }, 1000);
            setMatriculaTimeout(timeout);
        }
    };

    const renderStep = () => {
        if (success) {
            return (
                <View className="flex-1 items-center justify-center py-8">
                    <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                        <Icon name="check" size={32} color="#10B981" />
                    </View>
                    <Text className="text-2xl font-semibold text-gray-800 mb-2 text-center">
                        Registro Salvo com Sucesso!
                    </Text>
                    <Text className="text-gray-600 mb-6 text-center px-4">
                        O {tipoVistoria === "retirada" ? 'Check-in' : 'Check-out'} foi registrado com sucesso.
                    </Text>
                    <TouchableOpacity
                        onPress={resetForm}
                        className="bg-blue-600 px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-medium">Novo Registro</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        switch (currentStep) {
            case 1:
                return (
                    <>
                        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                            <View className="space-y-6 p-4">
                                <View className="flex-row items-center space-x-2 mb-4">
                                    <View className="w-8 h-8 rounded-full bg-[#004F9F] items-center justify-center">
                                        <Icon name="wrench" size={16} color="white" />
                                    </View>
                                    <Text className="text-base font-semibold text-gray-900 ml-2">Normas e Procedimentos</Text>
                                </View>

                                <View className="space-y-3 gap-3">
                                    <View className="bg-white p-4 rounded-lg border border-blue-100">
                                        <View className="flex-row items-center space-x-2 mb-2">
                                            <Icon name="car" size={16} color="#004F9F" />
                                            <Text className="text-sm font-medium text-[#004F9F]">Uso do Veículo</Text>
                                        </View>
                                        <Text className="text-xs text-gray-600">
                                            Veículos da empresa só podem ser utilizados para atividades relacionadas ao trabalho (NR-02, 5.1).
                                        </Text>
                                    </View>

                                    <View className="bg-white p-4 rounded-lg border border-blue-100">
                                        <View className="flex-row items-center space-x-2 mb-2">
                                            <Icon name="close" size={16} color="#004F9F" />
                                            <Text className="text-sm font-medium text-[#004F9F]">Limpeza</Text>
                                        </View>
                                        <Text className="text-xs text-gray-600">
                                            É necessário recolher todo o lixo do veículo antes da devolução. Mantenha o veículo limpo e organizado.
                                        </Text>
                                    </View>

                                    <View className="bg-white p-4 rounded-lg border border-blue-100">
                                        <View className="flex-row items-center space-x-2 mb-2">
                                            <Icon name="gas-station" size={16} color="#004F9F" />
                                            <Text className="text-sm font-medium text-[#004F9F]">Combustível</Text>
                                        </View>
                                        <Text className="text-xs text-gray-600">
                                            Ao devolver o veículo, certifique-se de que o tanque esteja com pelo menos metade da capacidade (1/2).
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </>
                );

            case 2:
                return (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        <View className="p-4">
                            <Text className="text-xl font-semibold text-gray-900 mb-6">Escolha o tipo de registro</Text>
                            <View className="gap-4">
                                <TouchableOpacity
                                    onPress={() => setTipoVistoria('retirada')}
                                    className={`p-4 rounded-lg border-2 ${tipoVistoria === 'retirada'
                                        ? 'border-[#004F9F] bg-blue-50'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <View className="items-center space-y-3">
                                        <View className={`w-12 h-12 rounded-full items-center justify-center ${tipoVistoria === 'retirada' ? 'bg-[#004F9F]' : 'bg-gray-200'
                                            }`}>
                                            <Icon
                                                name="car"
                                                size={24}
                                                color={tipoVistoria === 'retirada' ? 'white' : '#6B7280'}
                                            />
                                        </View>
                                        <View className="items-center">
                                            <Text className="font-medium text-gray-900 text-base">Check-in</Text>
                                            <Text className="text-sm text-gray-500 mt-1">Vou retirar um veículo</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setTipoVistoria('devolucao')}
                                    className={`p-4 rounded-lg border-2 ${tipoVistoria === 'devolucao'
                                        ? 'border-[#004F9F] bg-blue-50'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <View className="items-center space-y-3">
                                        <View className={`w-12 h-12 rounded-full items-center justify-center ${tipoVistoria === 'devolucao' ? 'bg-[#004F9F]' : 'bg-gray-200'}`}>
                                            <Icon
                                                name="car"
                                                size={24}
                                                color={tipoVistoria === 'devolucao' ? 'white' : '#6B7280'}
                                            />
                                        </View>
                                        <View className="items-center">
                                            <Text className="font-medium text-gray-900 text-base">Check-out</Text>
                                            <Text className="text-sm text-gray-500 mt-1">Vou devolver um veículo</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                );

            case 3:
                return (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        <View className="p-4 space-y-4">
                            <Text className="text-xl font-semibold text-gray-900 mb-4">Informações do Colaborador</Text>

                            {/* Matrícula */}
                            <View className="space-y-2">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Matrícula</Text>
                                <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white">
                                    <View className='w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3'>
                                        <Icon name="badge-account" size={20} color="#004F9F" />
                                    </View>
                                    <TextInput
                                        className="flex-1 text-base text-gray-900"
                                        value={exibindoNome ? colaborador : matriculaDigitada}
                                        onChangeText={handleMatriculaChange}
                                        placeholder="Insira o número de sua matrícula"
                                        placeholderTextColor="#9CA3AF"
                                        editable={!exibindoNome}
                                        keyboardType='numeric'
                                    />
                                    {verificandoMatricula && (
                                        <ActivityIndicator size="small" color="#004F9F" />
                                    )}
                                </View>
                            </View>

                            {/* Frota */}
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Frota</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowFrotaModal(true);
                                        Keyboard.dismiss();
                                    }}
                                    className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white"
                                    disabled={!exibindoNome || !colaborador}
                                >
                                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                                        <Icon name="car" size={20} color="#004F9F" />
                                    </View>
                                    <View className="flex-1 justify-center min-h-[24px]">
                                        <Text className={`text-base ${selectedVeiculo ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {selectedVeiculo ? `${selectedVeiculo.id}` : 'Selecione uma frota'}
                                        </Text>
                                        {selectedVeiculo ? (
                                            <Text className="text-sm text-gray-500">
                                                {selectedVeiculo.placa} - {selectedVeiculo.modelo?.toUpperCase()}
                                            </Text>
                                        ) : (
                                            <Text className="text-sm text-gray-500">
                                                Toque para selecionar a frota
                                            </Text>
                                        )}
                                    </View>
                                    <Icon name="chevron-down" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Quilometragem */}
                            <View className="space-y-2">
                                <Text className="text-sm font-medium text-gray-700 mb-2">Quilometragem</Text>
                                <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white">
                                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                                        <Icon name="speedometer" size={20} color="#004F9F" />
                                    </View>
                                    <TextInput
                                        className="flex-1 p-3 text-base text-gray-900"
                                        value={quilometragem}
                                        onChangeText={setQuilometragem}
                                        placeholder="Digite a quilometragem"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        editable={exibindoNome && !!colaborador}
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                );

            case 4:
                return (
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        <View className="p-4 space-y-6">
                            <Text className="text-xl font-semibold text-gray-900 mb-4">Estado do Veículo</Text>

                            {/* Combustível */}
                            <View className="space-y-2">
                                <Text className="text-sm font-medium text-gray-700">
                                    Nível de Combustível <Text className="text-red-500">*</Text>
                                </Text>
                                <View className="flex-row justify-between">
                                    {(['vazio', '1/4', '1/2', '3/4', 'cheio'] as const).map((nivel) => (
                                        <TouchableOpacity
                                            key={nivel}
                                            onPress={() => setCombustivel(nivel)}
                                            className={`flex-1 mx-1 p-3 rounded-lg border-2 ${combustivel === nivel
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200'
                                                }`}
                                        >
                                            <View className="items-center space-y-1">
                                                <Icon
                                                    name="gas-station"
                                                    size={20}
                                                    color={combustivel === nivel ? '#004F9F' : '#9CA3AF'}
                                                />
                                                <Text className={`text-xs font-medium ${combustivel === nivel ? 'text-blue-600' : 'text-gray-900'
                                                    }`}>
                                                    {nivel}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Estado Geral */}
                            <View className="space-y-2">
                                <Text className="text-sm font-medium text-gray-700">
                                    Estado Geral <Text className="text-red-500">*</Text>
                                </Text>
                                <View className="flex-row justify-between">
                                    {(['ruim', 'regular', 'bom', 'otimo'] as const).map((estado) => (
                                        <TouchableOpacity
                                            key={estado}
                                            onPress={() => setEstadoGeral(estado)}
                                            className={`flex-1 mx-1 p-3 rounded-lg border-2 ${estadoGeral === estado
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200'
                                                }`}
                                        >
                                            <View className="items-center space-y-1">
                                                <Icon
                                                    name="wrench"
                                                    size={20}
                                                    color={estadoGeral === estado ? '#004F9F' : '#9CA3AF'}
                                                />
                                                <Text className={`text-xs font-medium ${estadoGeral === estado ? 'text-blue-600' : 'text-gray-900'
                                                    }`}>
                                                    {estado}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Observações */}
                            <View className="space-y-2">
                                <View className="flex-row items-center">
                                    <Text className="text-sm font-medium text-gray-700">Observações</Text>
                                    <View className="ml-2 px-2 py-1 bg-gray-100 rounded-full">
                                        <Text className="text-xs font-medium text-gray-600">Opcional</Text>
                                    </View>
                                </View>
                                <TextInput
                                    className="bg-gray-50 rounded-lg border border-gray-300 p-3 text-base text-gray-900"
                                    value={observacoes}
                                    onChangeText={setObservacoes}
                                    placeholder="Digite suas observações sobre o veículo..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </ScrollView>
                );

            default:
                return null;
        }
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View style={{ paddingTop: 18 + insets.top }} className="px-6 pb-4 border-b border-gray-200">
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity onPress={() => setCurrentStep(0)} className="w-8">
                        <Icon name="chevron-left" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="text-xl font-semibold text-gray-900">Check-in/out</Text>
                        <Text className="text-sm text-gray-500">Passo {currentStep} de 4</Text>
                    </View>
                    <View className="w-8" />
                </View>

                {/* Progress Bar */}
                <View className="w-full bg-gray-200 rounded-full h-2">
                    <View
                        className="bg-[#004F9F] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / 4) * 100}%` }}
                    />
                </View>
            </View>

            {/* Content */}
            <View className="flex-1">
                {renderStep()}
            </View>

            {!success && (
                <View
                    className="bg-white border-t border-gray-200 p-4"
                    style={{ paddingBottom: insets.bottom + 16 }}
                >
                    <View className={`flex-row gap-2 ${currentStep === 1 ? 'justify-center' : 'justify-between'}`}>
                        {currentStep > 1 && (
                            <TouchableOpacity
                                onPress={() => setCurrentCheckStep(currentStep - 1)}
                                className="flex-1 flex-row items-center justify-center "
                            >
                                <Icon name="chevron-left" size={16} color="#6B7280" />
                                <Text className="text-gray-600">Voltar</Text>
                            </TouchableOpacity>
                        )}

                        {currentStep === 1 ? (
                            <TouchableOpacity
                                onPress={handleNextStep}
                                className="w-full justify-center items-center px-6 py-3 bg-[#004F9F] rounded-lg font-medium hover:bg-[#003F7F] transition-colors"
                            >
                                <Text className="text-white font-medium mr-2">Iniciar</Text>
                                <Icon name="chevron-right" size={16} color="white" />
                            </TouchableOpacity>
                        ) : currentStep < 4 ? (
                            <TouchableOpacity
                                onPress={handleNextStep}
                                className="flex-1 justify-center items-center bg-[#004F9F] px-6 py-3 rounded-lg flex-row text-white font-medium hover:bg-[#003F7F] transition-colors"
                            >
                                <Text className="text-white font-medium mr-2">Próximo</Text>
                                <Icon name="chevron-right" size={16} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={loading}
                                className={`flex-1 justify-center items-center bg-[#004F9F] px-6 py-3 rounded-lg flex-row ${loading ? 'opacity-50' : ''}`}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-medium">Finalizar</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
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

                        {searchingFrotas ? (
                            <View className="items-center py-8">
                                <ActivityIndicator size="large" color="#004F9F" />
                                <Text className="text-gray-500 mt-2">Pesquisando...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={frotas}
                                keyExtractor={(item, index) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedVeiculo(item);
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
                                            {selectedVeiculo?.id === item.id && <Icon name="check-circle" size={24} color="#10B981" />}
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View className="items-center py-8">
                                        <Icon name="car-off" size={48} color="#9CA3AF" />
                                        <Text className="text-center text-gray-500 mt-2">
                                            {searchQuery ? 'Nenhuma frota encontrada para a pesquisa' : 'Nenhuma frota disponível'}
                                        </Text>
                                    </View>
                                }
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="none"
                                onEndReached={() => { if (hasMore && !searchingFrotas) loadFrotas(false, searchQuery); }}
                                onEndReachedThreshold={0.3}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}
