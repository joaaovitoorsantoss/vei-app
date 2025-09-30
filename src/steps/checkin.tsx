import React, { useState, useEffect, useRef } from 'react';
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
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStep } from '../context/StepContext';
import { StepIndicator } from '../components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '@env';

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
    const scrollViewRef = useRef<ScrollView>(null);
    const [showFrotaModal, setShowFrotaModal] = useState(false);
    const [frotas, setFrotas] = useState<Veiculo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchingFrotas, setSearchingFrotas] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        loadFrotas(true, '');

        return () => {
            if (matriculaTimeout) {
                clearTimeout(matriculaTimeout);
            }
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, []);

    const loadFrotas = async (reset = false, query = '') => {
        if (loading || loadingMore) return;

        if (reset) {
            setPage(1);
            setHasMore(true);
            setLoading(true);
            setSearchingFrotas(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const response = await axios.get(`${API_URL}/frota/paginated`, {
                params: {
                    page: reset ? 1 : page,
                    limit: 10,
                    search: query || undefined
                },
            });

            const newFrotas = response.data.veiculos || response.data;

            setFrotas((prev) => {
                if (reset) return newFrotas;
                return [...prev, ...newFrotas.filter((n: any) => !prev.some((p) => p.id === n.id))];
            });

            if (page >= (response.data.totalPages || 1) || newFrotas.length === 0) {
                setHasMore(false);
            } else if (reset) {
                setPage(2);
            } else {
                setPage((prev) => prev + 1);
            }
        } catch (error) {
            console.error('Erro ao carregar frotas:', error);
            Alert.alert('Erro', 'Erro ao carregar frotas. Tente novamente.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setSearchingFrotas(false);
        }
    };

    const debouncedSearch = (query: string) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        setSearchingFrotas(true);
        const timeout = setTimeout(() => {
            loadFrotas(true, query);
        }, 300);

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
            case 2:
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
                        <View className="items-center space-y-3 mb-8">
                            <Text className="text-3xl font-bold text-gray-900 text-center">
                                Check-in/Check-out
                            </Text>
                            <Text className="text-base text-gray-600 text-center">
                                Leia as normas e procedimentos antes de prosseguir
                            </Text>
                            <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
                                <Icon name="information" size={20} color="#004F9F" />
                                <Text className="text-blue-600 ml-2 font-medium">
                                    Normas obrigatórias da empresa
                                </Text>
                            </View>
                        </View>

                        <View className="space-y-4 gap-3">
                            <View className="bg-white p-4 rounded-xl border border-gray-200">
                                <View className="flex-row items-center space-x-3 mb-3">
                                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                                        <Icon name="car" size={20} color="#004F9F" />
                                    </View>
                                    <Text className="text-lg font-semibold text-gray-900">Uso do Veículo</Text>
                                </View>
                                <Text className="text-gray-600 leading-5 pl-13">
                                    Veículos da empresa só podem ser utilizados para atividades relacionadas ao trabalho (NR-02, 5.1).
                                </Text>
                            </View>

                            <View className="bg-white p-4 rounded-xl border border-gray-200">
                                <View className="flex-row items-center space-x-3 mb-3">
                                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                                        <Icon name="delete-sweep" size={20} color="#004F9F" />
                                    </View>
                                    <Text className="text-lg font-semibold text-gray-900">Limpeza</Text>
                                </View>
                                <Text className="text-gray-600 leading-5 pl-13">
                                    É necessário recolher todo o lixo do veículo antes da devolução. Mantenha o veículo limpo e organizado.
                                </Text>
                            </View>

                            <View className="bg-white p-4 rounded-xl border border-gray-200">
                                <View className="flex-row items-center space-x-3 mb-3">
                                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                                        <Icon name="gas-station" size={20} color="#004F9F" />
                                    </View>
                                    <Text className="text-lg font-semibold text-gray-900">Combustível</Text>
                                </View>
                                <Text className="text-gray-600 leading-5 pl-13">
                                    Ao devolver o veículo, certifique-se de que o tanque esteja com pelo menos metade da capacidade (1/2).
                                </Text>
                            </View>
                        </View>
                    </>
                );

            case 2:
                return (
                    <>
                        <View className="items-center space-y-3 mb-4">
                            <Text className="text-3xl font-bold text-gray-900 text-center">
                                Tipo de Registro
                            </Text>
                            <Text className="text-base text-gray-600 text-center">
                                Escolha se você está retirando ou devolvendo um veículo
                            </Text>
                            <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
                                <Icon name="swap-horizontal" size={20} color="#004F9F" />
                                <Text className="text-blue-600 ml-2 font-medium">
                                    Selecione uma opção
                                </Text>
                            </View>
                        </View>

                        <View className="space-y-4 gap-3">
                            <TouchableOpacity
                                onPress={() => setTipoVistoria('retirada')}
                                className={`bg-white rounded-xl border-2 p-6 ${tipoVistoria === 'retirada'
                                    ? 'border-[#004F9F] bg-blue-50'
                                    : 'border-gray-200'
                                    }`}
                            >
                                <View className="flex-row items-center">
                                    <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${tipoVistoria === 'retirada' ? 'bg-[#004F9F]' : 'bg-gray-100'
                                        }`}>
                                        <Icon
                                            name="car"
                                            size={32}
                                            color={tipoVistoria === 'retirada' ? 'white' : '#6B7280'}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-semibold text-gray-900 mb-1">Check-in</Text>
                                        <Text className="text-gray-600">Vou retirar um veículo da frota</Text>
                                    </View>
                                    {tipoVistoria === 'retirada' && (
                                        <Icon name="check-circle" size={24} color="#004F9F" />
                                    )}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setTipoVistoria('devolucao')}
                                className={`bg-white rounded-xl border-2 p-6 ${tipoVistoria === 'devolucao'
                                    ? 'border-[#004F9F] bg-blue-50'
                                    : 'border-gray-200'
                                    }`}
                            >
                                <View className="flex-row items-center">
                                    <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${tipoVistoria === 'devolucao' ? 'bg-[#004F9F]' : 'bg-gray-100'
                                        }`}>
                                        <Icon
                                            name="keyboard-return"
                                            size={32}
                                            color={tipoVistoria === 'devolucao' ? 'white' : '#6B7280'}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xl font-semibold text-gray-900 mb-1">Check-out</Text>
                                        <Text className="text-gray-600">Vou devolver um veículo da frota</Text>
                                    </View>
                                    {tipoVistoria === 'devolucao' && (
                                        <Icon name="check-circle" size={24} color="#004F9F" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </>
                );

            case 3:
                return (
                    <>
                        <View className="items-center space-y-3 mb-8">
                            <Text className="text-3xl font-bold text-gray-900 text-center">
                                Informações do Veículo
                            </Text>
                            <Text className="text-base text-gray-600 text-center">
                                Preencha os dados do veículo para registrar o {tipoVistoria === 'retirada' ? 'check-in' : 'check-out'}
                            </Text>
                            <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
                                <Icon name="information" size={20} color="#004F9F" />
                                <Text className="text-blue-600 ml-2 font-medium">
                                    Digite sua matrícula para continuar
                                </Text>
                            </View>
                        </View>

                        <View className="space-y-4 mb-8 gap-3">
                            {/* Matrícula */}
                            <View>
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
                                {exibindoNome && colaborador && (
                                    <View className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <View className="flex-row items-center">
                                            <Icon name="check-circle" size={20} color="#10B981" />
                                            <Text className="text-green-800 ml-2 font-medium">
                                                {colaborador}
                                            </Text>
                                        </View>
                                        <Text className="text-green-600 text-sm ml-6">
                                            Matrícula: {matriculaDigitada}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {exibindoNome && (
                                <>
                                    {/* Frota */}
                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Frota</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowFrotaModal(true);
                                                Keyboard.dismiss();
                                            }}
                                            className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white"
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
                                    <View>
                                        <Text className="text-sm font-medium text-gray-700 mb-2">Quilometragem</Text>
                                        <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3 bg-white">
                                            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                                                <Icon name="speedometer" size={20} color="#004F9F" />
                                            </View>
                                            <TextInput
                                                className="flex-1 text-base text-gray-900"
                                                value={quilometragem}
                                                onChangeText={setQuilometragem}
                                                placeholder="Digite a quilometragem atual"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                onFocus={() => {
                                                    setTimeout(() => {
                                                        scrollViewRef.current?.scrollToEnd({ animated: true });
                                                    }, 300);
                                                }}
                                            />
                                            <Text className="text-gray-500 ml-2">km</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </>
                );

            case 4:
                return (
                    <>
                        <View className="items-center space-y-3 mb-8">
                            <Text className="text-3xl font-bold text-gray-900 text-center">
                                Estado do Veículo
                            </Text>
                            <Text className="text-base text-gray-600 text-center">
                                Avalie o estado atual do veículo selecionado
                            </Text>
                            <View className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full mt-2">
                                <Icon name="clipboard-check" size={20} color="#004F9F" />
                                <Text className="text-blue-600 ml-2 font-medium">
                                    {selectedVeiculo?.id} | {selectedVeiculo?.placa} - {selectedVeiculo?.modelo}
                                </Text>
                            </View>
                        </View>

                        <View className="space-y-6 gap-3">
                            {/* Combustível */}
                            <View>
                                <View className="flex-row items-center mb-2">
                                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                        <Icon name="gas-station" size={20} color="#004F9F" />
                                    </View>
                                    <Text className="text-xl font-bold text-gray-900">Nível de Combustível</Text>
                                    <Text className="text-red-500 ml-2 text-lg">*</Text>
                                </View>

                                <Text className="text-gray-600 mb-6 leading-relaxed text-base">
                                    Selecione o nível atual de combustível do veículo
                                </Text>

                                <View className="flex-row justify-between gap-2">
                                    {(['vazio', '1/4', '1/2', '3/4', 'cheio'] as const).map((nivel, index) => {
                                        const getFuelColor = () => {
                                            switch (nivel) {
                                                case 'vazio': return '#EF4444';
                                                case '1/4': return '#F59E0B';
                                                case '1/2': return '#F59E0B';
                                                case '3/4': return '#10B981';
                                                case 'cheio': return '#059669';
                                                default: return '#9CA3AF';
                                            }
                                        };

                                        const isSelected = combustivel === nivel;

                                        return (
                                            <TouchableOpacity
                                                key={nivel}
                                                onPress={() => setCombustivel(nivel)}
                                                activeOpacity={0.7}
                                                className={`flex-1 p-3 rounded-xl border min-h-[110px] ${isSelected
                                                    ? 'border-[#004F9F] bg-white'
                                                    : 'border-gray-200 bg-white'
                                                    }`}
                                            >
                                                <View className="items-center justify-between flex-1 py-1">
                                                    {/* Fuel gauge visual - maior e mais visível */}
                                                    <View className="w-10 h-14 border-2 border-gray-300 rounded-lg relative overflow-hidden bg-gray-50">
                                                        <View
                                                            className="absolute bottom-0 left-0 right-0 rounded-b-md transition-all"
                                                            style={{
                                                                height: `${(index + 1) * 20}%`,
                                                                backgroundColor: isSelected ? getFuelColor() : '#E5E7EB'
                                                            }}
                                                        />
                                                        {/* Fuel pump icon inside gauge */}
                                                        <View className="absolute inset-0 items-center justify-center">
                                                            <Icon
                                                                name="gas-station"
                                                                size={12}
                                                                color={isSelected ? 'white' : '#9CA3AF'}
                                                            />
                                                        </View>
                                                    </View>

                                                    {/* Main icon circle - menor para economizar espaço */}
                                                    <View className={`w-10 h-10 rounded-full items-center justify-center my-2 ${isSelected ? 'bg-[#004F9F]' : 'bg-gray-200'
                                                        }`}>
                                                        <Icon
                                                            name="fuel"
                                                            size={16}
                                                            color={isSelected ? 'white' : '#9CA3AF'}
                                                        />
                                                    </View>

                                                    {/* Label with better spacing */}
                                                    <Text className={`text-xs font-bold text-center leading-tight ${isSelected ? 'text-[#004F9F]' : 'text-gray-600'
                                                        }`}>
                                                        {nivel}
                                                    </Text>

                                                    {/* Check badge - posicionado melhor */}
                                                    {isSelected && (
                                                        <View className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full items-center justify-center">
                                                            <Icon name="check" size={12} color="white" />
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Estado Geral */}
                            <View>
                                <View className="flex-row items-center mb-2">
                                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                        <Icon name="clipboard-check" size={20} color="#004F9F" />
                                    </View>
                                    <Text className="text-xl font-bold text-gray-900">Estado Geral</Text>
                                    <Text className="text-red-500 ml-2 text-lg">*</Text>
                                </View>

                                <Text className="text-gray-600 mb-4 leading-relaxed">
                                    Avalie o estado geral do veículo
                                </Text>

                                {/* Grid Layout 2x2 */}
                                <View className="flex-row flex-wrap gap-3">
                                    {(['ruim', 'regular', 'bom', 'otimo'] as const).map((estado, index) => {
                                        const getEstadoColor = () => {
                                            switch (estado) {
                                                case 'ruim': return '#EF4444';
                                                case 'regular': return '#F59E0B';
                                                case 'bom': return '#10B981';
                                                case 'otimo': return '#059669';
                                                default: return '#9CA3AF';
                                            }
                                        };

                                        const getEstadoIcon = () => {
                                            switch (estado) {
                                                case 'ruim': return 'close-circle';
                                                case 'regular': return 'alert-circle';
                                                case 'bom': return 'check-circle';
                                                case 'otimo': return 'star-circle';
                                                default: return 'help-circle';
                                            }
                                        };

                                        const getEstadoText = () => {
                                            switch (estado) {
                                                case 'ruim': return 'Problemas visíveis';
                                                case 'regular': return 'Pequenos desgastes';
                                                case 'bom': return 'Boas condições';
                                                case 'otimo': return 'Excelente estado';
                                                default: return '';
                                            }
                                        };

                                        const isSelected = estadoGeral === estado;
                                        const estadoColor = getEstadoColor();

                                        return (
                                            <TouchableOpacity
                                                key={estado}
                                                onPress={() => setEstadoGeral(estado)}
                                                activeOpacity={0.7}
                                                className={`bg-white rounded-xl border p-4 min-h-[85px] ${isSelected
                                                    ? 'border-[#004F9F]'
                                                    : 'border-gray-200'
                                                    }`}
                                                style={{
                                                    width: '48%', // Cada card ocupa quase metade da largura
                                                }}
                                            >
                                                <View className="items-center justify-center flex-1">
                                                    {/* Status indicator - centralizado e compacto */}
                                                    <View className="relative mb-2">
                                                        <View className={`w-10 h-10 rounded-full items-center justify-center ${isSelected ? 'bg-[#004F9F]' : 'bg-gray-100'
                                                            }`}>
                                                            <Icon
                                                                name={getEstadoIcon()}
                                                                size={18}
                                                                color={isSelected ? 'white' : estadoColor}
                                                            />
                                                        </View>

                                                        {/* Color dot indicator */}
                                                        <View
                                                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                                                            style={{ backgroundColor: estadoColor }}
                                                        />

                                                        {isSelected && (
                                                            <View className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full items-center justify-center">
                                                                <Icon name="check" size={10} color="white" />
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Texto centralizado */}
                                                    <Text className={`text-sm font-bold capitalize text-center mb-1 ${isSelected ? 'text-[#004F9F]' : 'text-gray-900'
                                                        }`}>
                                                        {estado}
                                                    </Text>

                                                    <Text className="text-xs text-gray-600 text-center leading-tight">
                                                        {getEstadoText()}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Observações */}
                            <View>
                                <View className="flex-row items-center mb-3">
                                    <Text className="text-lg font-semibold text-gray-900">Observações</Text>
                                    <View className="ml-3 px-3 py-1 bg-gray-100 rounded-full">
                                        <Text className="text-xs font-medium text-gray-600">Opcional</Text>
                                    </View>
                                </View>
                                <View className="bg-white rounded-xl border border-gray-200 p-4 mb-16">
                                    <View className="flex-row items-start">
                                        <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3 mt-1">
                                            <Icon name="note-text" size={20} color="#004F9F" />
                                        </View>
                                        <View className="flex-1">
                                            <TextInput
                                                className="text-base text-gray-900 min-h-[80px]"
                                                value={observacoes}
                                                onChangeText={(text) => {
                                                    if (text.length <= 500) {
                                                        setObservacoes(text);
                                                    }
                                                }}
                                                placeholder="Descreva qualquer detalhe importante sobre o veículo, como arranhões, problemas mecânicos ou outras observações relevantes..."
                                                placeholderTextColor="#9CA3AF"
                                                multiline
                                                textAlignVertical="top"
                                                maxLength={500}
                                            />
                                            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                                <Text className="text-xs text-gray-500">
                                                    {observacoes.length}/500 caracteres
                                                </Text>
                                                {observacoes.length > 0 && (
                                                    <TouchableOpacity onPress={() => setObservacoes('')}>
                                                        <Text className="text-xs text-blue-600">Limpar</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <View className="flex-1 bg-white">
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                <ScrollView
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 18 + insets.top,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-6">
                        <TouchableOpacity onPress={() => setCurrentStep(0)} className="w-8">
                            <Icon name="chevron-left" size={24} color="#6B7280" />
                        </TouchableOpacity>
                        <View className="absolute left-1/2 -translate-x-1/2">
                            <StepIndicator currentStep={currentStep} totalSteps={4} />
                        </View>
                    </View>

                    {renderStep()}
                </ScrollView>
            </KeyboardAvoidingView>

            {!success && (
                <View style={{ position: 'absolute', bottom: insets.bottom + 16, left: 24, right: 24 }}>
                    <View className="flex-row gap-3">
                        {currentStep > 1 && (
                            <TouchableOpacity
                                onPress={() => setCurrentCheckStep(currentStep - 1)}
                                className="flex-1 bg-gray-100 border border-gray-200 rounded-xl py-4 px-6 flex-row items-center justify-center min-h-[52px]"
                            >
                                <Icon name="chevron-left" size={20} color="#6B7280" />
                                <Text className="text-gray-600 font-medium ml-2">Voltar</Text>
                            </TouchableOpacity>
                        )}

                        {currentStep === 1 ? (
                            <LinearGradient
                                colors={['#004F9F', '#009FE3']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ borderRadius: 12, flex: 1 }}
                            >
                                <TouchableOpacity
                                    onPress={handleNextStep}
                                    activeOpacity={0.8}
                                    className="py-4 px-6 flex-row items-center justify-center min-h-[52px]"
                                >
                                    <Text className="text-white text-lg font-semibold mr-2">Iniciar</Text>
                                    <Icon name="chevron-right" size={20} color="white" />
                                </TouchableOpacity>
                            </LinearGradient>
                        ) : currentStep < 4 ? (
                            <LinearGradient
                                colors={['#004F9F', '#009FE3']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ borderRadius: 12, flex: currentStep > 1 ? 2 : 1 }}
                            >
                                <TouchableOpacity
                                    onPress={handleNextStep}
                                    activeOpacity={0.8}
                                    className="py-4 px-6 flex-row items-center justify-center min-h-[52px]"
                                >
                                    <Text className="text-white text-lg font-semibold mr-2">Próximo</Text>
                                    <Icon name="chevron-right" size={20} color="white" />
                                </TouchableOpacity>
                            </LinearGradient>
                        ) : (
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ borderRadius: 12, flex: 2, opacity: loading ? 0.7 : 1 }}
                            >
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                    className="py-4 px-6 flex-row items-center justify-center min-h-[52px]"
                                >
                                    {loading ? (
                                        <>
                                            <ActivityIndicator size="small" color="white" />
                                            <Text className="text-white text-lg font-semibold ml-2">Salvando...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text className="text-white text-lg font-semibold mr-2">Finalizar</Text>
                                            <Icon name="check-circle" size={20} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </LinearGradient>
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
                            <Icon name="magnify" size={20} color="#6B7280" style={{ marginRight: 12 }} />
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
                            ListFooterComponent={() =>
                                loadingMore ? (
                                    <View className="py-4 items-center">
                                        <ActivityIndicator size="small" color="#004F9F" />
                                        <Text className="text-gray-500 mt-2 text-sm">Carregando mais...</Text>
                                    </View>
                                ) : null
                            }
                        />
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}
