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
    Dimensions
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

    useEffect(() => {
        fetchVeiculos();

        return () => {
            if (matriculaTimeout) {
                clearTimeout(matriculaTimeout);
            }
        };
    }, []);

    const fetchVeiculos = async () => {
        try {
            const response = await axios.get(`${API_URL}/frota`);
            setVeiculos(response.data);
        } catch (error) {
            console.error('Erro ao carregar veículos:', error);
            Alert.alert('Erro', 'Erro ao carregar veículos. Tente novamente.');
        }
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
                        <View>
                            <Image
                                source={require('../../assets/logo.png')}
                                className="w-32 h-32"
                                resizeMode="contain"
                            />
                        </View>
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
                            <View className="space-y-4">
                                <TouchableOpacity
                                    onPress={() => setTipoVistoria('retirada')}
                                    className={`p-4 rounded-lg border-2 ${tipoVistoria === 'retirada'
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <View className="items-center space-y-3">
                                        <View className={`w-12 h-12 rounded-full items-center justify-center ${tipoVistoria === 'retirada' ? 'bg-blue-600' : 'bg-gray-200'
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
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <View className="items-center space-y-3">
                                        <View className={`w-12 h-12 rounded-full items-center justify-center ${tipoVistoria === 'devolucao' ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}>
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
                                <Text className="text-sm font-medium text-gray-700">Matrícula</Text>
                                <View className="flex-row items-center bg-gray-50 rounded-lg border border-gray-300 px-3">
                                    <Icon name="account" size={20} color="#6B7280" />
                                    <TextInput
                                        className="flex-1 p-3 text-base text-gray-900"
                                        value={exibindoNome ? colaborador : matriculaDigitada}
                                        onChangeText={handleMatriculaChange}
                                        placeholder="Insira o número de sua matrícula"
                                        placeholderTextColor="#9CA3AF"
                                        editable={!exibindoNome}
                                    />
                                    {verificandoMatricula && (
                                        <ActivityIndicator size="small" color="#004F9F" />
                                    )}
                                </View>
                            </View>

                            {/* Veículo */}
                            <View className="space-y-2">
                                <Text className="text-sm font-medium text-gray-700">Frota</Text>
                                <View className="bg-gray-50 rounded-lg border border-gray-300">
                                    {selectedVeiculo ? (
                                        <TouchableOpacity
                                            onPress={() => setSelectedVeiculo(null)}
                                            className="flex-row items-center justify-between p-3"
                                            disabled={!exibindoNome || !colaborador}
                                        >
                                            <View className="flex-row items-center">
                                                <Icon name="car" size={20} color="#004F9F" />
                                                <Text className="ml-3 text-base text-gray-900">
                                                    {selectedVeiculo.id} {selectedVeiculo.modelo} - {selectedVeiculo.placa}
                                                </Text>
                                            </View>
                                            <Icon name="close" size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    ) : (
                                        <ScrollView
                                            className="max-h-40"
                                            showsVerticalScrollIndicator={true}
                                        >
                                            {veiculos.map((veiculo) => (
                                                <TouchableOpacity
                                                    key={veiculo.id}
                                                    onPress={() => setSelectedVeiculo(veiculo)}
                                                    className="flex-row items-center p-3 border-b border-gray-200"
                                                    disabled={!exibindoNome || !colaborador}
                                                >
                                                    <Icon name="car" size={20} color="#6B7280" />
                                                    <Text className="ml-3 text-base text-gray-900">
                                                        {veiculo.id} {veiculo.modelo} - {veiculo.placa}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            </View>

                            {/* Quilometragem */}
                            <View className="space-y-2">
                                <Text className="text-sm font-medium text-gray-700">Quilometragem</Text>
                                <View className="flex-row items-center bg-gray-50 rounded-lg border border-gray-300 px-3">
                                    <Icon name="speedometer" size={20} color="#6B7280" />
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

            {/* Bottom Buttons */}
            {!success && (
                <View
                    className="bg-white border-t border-gray-200 p-4"
                    style={{ paddingBottom: insets.bottom + 16 }}
                >
                    <View className="flex-row justify-between items-center">
                        {currentStep > 1 && (
                            <TouchableOpacity
                                onPress={() => setCurrentCheckStep(currentStep - 1)}
                                className="flex-row items-center space-x-2 px-4 py-2"
                            >
                                <Icon name="chevron-left" size={16} color="#6B7280" />
                                <Text className="text-gray-600">Voltar</Text>
                            </TouchableOpacity>
                        )}

                        <View className="flex-1" />

                        {currentStep === 1 ? (
                            <TouchableOpacity
                                onPress={handleNextStep}
                                className="w-full flex-row flex items-center justify-center space-x-2 px-6 py-3 bg-[#004F9F] text-white rounded-lg font-medium hover:bg-[#003F7F] transition-colors"
                            >
                                <Text className="text-white font-medium mr-2">Iniciar</Text>
                                <Icon name="chevron-right" size={16} color="white" />
                            </TouchableOpacity>
                        ) : currentStep < 4 ? (
                            <TouchableOpacity
                                onPress={handleNextStep}
                                className="bg-[#004F9F] px-6 py-3 rounded-lg flex-row items-center"
                            >
                                <Text className="text-white font-medium mr-2">Próximo</Text>
                                <Icon name="chevron-right" size={16} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={loading}
                                className={`bg-[#004F9F] px-6 py-3 rounded-lg flex-row items-center ${loading ? 'opacity-50' : ''
                                    }`}
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
        </View>
    );
}
