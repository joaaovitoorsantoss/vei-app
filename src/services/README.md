# Sistema de Sincronização

Este sistema permite que dados de vistoria sejam enviados automaticamente quando houver conexão de rede estável, mesmo após falhas de envio.

## Funcionalidades

### 1. Fila de Sincronização
- Armazena dados que falharam no envio
- Tenta reenviar automaticamente quando há rede
- Limite de 3 tentativas por item
- Intervalo de 30 segundos entre tentativas

### 2. Monitoramento de Rede
- Detecta automaticamente quando há conexão
- Inicia sincronização quando rede fica disponível
- Para sincronização quando rede é perdida

### 3. Interface de Usuário
- Indicador visual de status de sincronização
- Botão para forçar sincronização manual
- Contador de itens pendentes

## Como Usar

### 1. Adicionar à Fila de Sincronização

```typescript
import { syncService } from '../services/SyncService';

// Quando houver erro no envio
try {
  await sendData();
} catch (error) {
  // Adiciona à fila para tentar novamente automaticamente
  await syncService.addToQueue(vistoriaData);
}
```

### 2. Usar o Hook de Status

```typescript
import { useSyncStatus } from '../hooks/useSyncStatus';

function MyComponent() {
  const { status, queueStatus, forceSync, clearQueue } = useSyncStatus();
  
  return (
    <View>
      <Text>Status: {status}</Text>
      <Text>Pendentes: {queueStatus.pending}</Text>
      <Button onPress={forceSync} title="Forçar Sincronização" />
    </View>
  );
}
```

### 3. Usar o Componente de Indicador

```typescript
import { SyncIndicator } from '../components/SyncIndicator';

function MyScreen() {
  return (
    <View>
      <SyncIndicator />
      {/* Resto do conteúdo */}
    </View>
  );
}
```

## Configuração

### Permissões Android
Adicione as seguintes permissões no `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

### Dependências
```bash
npm install @react-native-community/netinfo
```

## API do SyncService

### Métodos Principais

- `addToQueue(data: VistoriaData)`: Adiciona dados à fila
- `forceSync()`: Força sincronização imediata
- `getQueueStatus()`: Retorna status da fila
- `clearQueue()`: Limpa a fila de sincronização
- `addListener(callback)`: Adiciona listener para mudanças de status

### Estados de Sincronização

- `idle`: Não há sincronização ativa
- `syncing`: Sincronização em andamento
- `error`: Erro na sincronização

## Comportamento

1. **Falha no Envio**: Dados são automaticamente adicionados à fila
2. **Detecção de Rede**: Sistema inicia sincronização automaticamente
3. **Tentativas**: Máximo de 3 tentativas por item
4. **Intervalo**: 30 segundos entre tentativas
5. **Sucesso**: Item é removido da fila
6. **Falha Final**: Item é removido após 3 tentativas

## Monitoramento

O sistema fornece feedback visual em tempo real:
- Indicador de sincronização ativa
- Contador de itens pendentes
- Botão para forçar sincronização
- Status de erro com opção de retry
