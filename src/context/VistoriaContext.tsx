import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Frota {
  id: number;
  modelo: string;
  ano: number;
  placa: string;
}

interface Checklist {
  crlv: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  pneus: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  freios: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  farois: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  cintos: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  triangulo: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  macaco: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  chave_roda: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  nivel_oleo_motor: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  nivel_oleo_freio: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
  nivel_agua_radiador: 'conforme' | 'nao_conforme' | 'nao_aplicavel';
}

interface Avaliacoes {
  limpeza: number;
  manutencao: number;
  pintura: number;
  vidros: number;
  estofados: number;
  travas_eletricas: number;
  alarme: number;
  buzina: number;
  retrovisores: number;
  bateria: number;
  limpador_para_brisas: number;
  funcionamento_geral: number;
}

interface Observacao {
  texto: string;
  foto: string;
}

interface Fotos {
  hodometro: string;
  frente: string;
  traseira: string;
  lateral_esquerda: string;
  lateral_direita: string;
  interior_frontal: string;
  interior_traseiro: string;
  motor: string;
}

interface EstadoTecnico {
  [key: string]: string;
}

export interface VistoriaData {
  id?: number;
  nome: string;
  matricula?: string;
  frota: string;
  placa?: string;
  modelo?: string;
  quilometragem: number;
  checklist: Checklist;
  avaliacoes: Avaliacoes;
  estado_tecnico: EstadoTecnico;
  fotos: Fotos;
  observacoes: Observacao[];
  status: 'em_andamento' | 'concluida';
  data_criacao?: string;
  data_conclusao?: string;
}

interface VistoriaContextData {
  vistoriaData: VistoriaData;
  updateVistoriaData: (data: Partial<VistoriaData>) => Promise<void>;
  clearVistoriaData: () => Promise<void>;
  saveVistoriaId: (id: number) => Promise<void>;
  loadVistoriaData: () => Promise<void>;
  hasVistoria: () => Promise<boolean>;
}

const VistoriaContext = createContext<VistoriaContextData>({} as VistoriaContextData);

const STORAGE_KEY = '@vistoria_data';
const VISTORIA_ID_KEY = '@vistoria_id';

const initialVistoriaData: VistoriaData = {
  nome: '',
  matricula: '',
  frota: '',
  quilometragem: 0,
  checklist: {
    crlv: 'nao_aplicavel',
    pneus: 'nao_aplicavel',
    freios: 'nao_aplicavel',
    farois: 'nao_aplicavel',
    cintos: 'nao_aplicavel',
    triangulo: 'nao_aplicavel',
    macaco: 'nao_aplicavel',
    chave_roda: 'nao_aplicavel',
    nivel_oleo_motor: 'nao_aplicavel',
    nivel_oleo_freio: 'nao_aplicavel',
    nivel_agua_radiador: 'nao_aplicavel'
  },
  avaliacoes: {
    limpeza: 0,
    manutencao: 0,
    pintura: 0,
    vidros: 0,
    estofados: 0,
    travas_eletricas: 0,
    alarme: 0,
    buzina: 0,
    retrovisores: 0,
    bateria: 0,
    limpador_para_brisas: 0,
    funcionamento_geral: 0
  },
  estado_tecnico: {},
  fotos: {
    hodometro: '',
    frente: '',
    traseira: '',
    lateral_esquerda: '',
    lateral_direita: '',
    interior_frontal: '',
    interior_traseiro: '',
    motor: ''
  },
  observacoes: [],
  status: 'em_andamento'
};

export function VistoriaProvider({ children }: { children: React.ReactNode }) {
  const [vistoriaData, setVistoriaData] = useState<VistoriaData>(initialVistoriaData);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('Dados carregados do AsyncStorage:', parsedData);
        setVistoriaData(parsedData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da vistoria:', error);
    }
  };

  const hasVistoria = async (): Promise<boolean> => {
    try {
      const vistoriaId = await AsyncStorage.getItem(VISTORIA_ID_KEY);
      return !!vistoriaId;
    } catch {
      return false;
    }
  };

  const loadVistoriaData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setVistoriaData(parsedData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da vistoria:', error);
    }
  };

  const updateVistoriaData = async (data: Partial<VistoriaData>) => {
    try {
      console.log('Atualizando dados da vistoria:', data);
      const newData = { ...vistoriaData, ...data };
      console.log('Novos dados completos:', newData);
      setVistoriaData(newData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      console.log('Dados salvos no AsyncStorage com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar dados da vistoria:', error);
    }
  };

  const saveVistoriaId = async (id: number) => {
    try {
      await AsyncStorage.setItem(VISTORIA_ID_KEY, id.toString());
      const newData = { ...vistoriaData, id };
      setVistoriaData(newData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Erro ao salvar ID da vistoria:', error);
    }
  };

  const clearVistoriaData = async () => {
    try {
      setVistoriaData(initialVistoriaData);
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(VISTORIA_ID_KEY);
    } catch (error) {
      console.error('Erro ao limpar dados da vistoria:', error);
    }
  };

  return (
    <VistoriaContext.Provider
      value={{
        vistoriaData,
        updateVistoriaData,
        clearVistoriaData,
        saveVistoriaId,
        loadVistoriaData,
        hasVistoria,
      }}
    >
      {children}
    </VistoriaContext.Provider>
  );
}

export function useVistoria() {
  const context = useContext(VistoriaContext);
  if (!context) {
    throw new Error('useVistoria must be used within a VistoriaProvider');
  }
  return context;
}