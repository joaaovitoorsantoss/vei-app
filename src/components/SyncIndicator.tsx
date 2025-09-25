import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSyncStatus } from '../hooks/useSyncStatus';

interface SyncIndicatorProps {
  showWhenIdle?: boolean;
  className?: string;
}

export function SyncIndicator({ showWhenIdle = false, className = '' }: SyncIndicatorProps) {
  const { status, queueStatus, forceSync } = useSyncStatus();

  // Não mostra se não há itens pendentes e showWhenIdle é false
  if (queueStatus.pending === 0 && !showWhenIdle) {
    return null;
  }

  return (
    <View className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <View className="flex-row items-center">
        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
          {status === 'syncing' ? (
            <ActivityIndicator size="small" color="#004F9F" />
          ) : (
            <Icon name="cloud-upload" size={20} color="#004F9F" />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-blue-800 font-medium text-sm">
            {status === 'syncing' ? 'Sincronizando...' : 'Aguardando sincronização'}
          </Text>
          <Text className="text-blue-600 text-xs">
            {queueStatus.pending} item{queueStatus.pending !== 1 ? 's' : ''} pendente{queueStatus.pending !== 1 ? 's' : ''}
          </Text>
        </View>
        {queueStatus.pending > 0 && (
          <TouchableOpacity
            onPress={forceSync}
            className="p-2"
            accessibilityLabel="Forçar sincronização"
            accessibilityHint="Tenta sincronizar os dados pendentes agora"
          >
            <Icon name="refresh" size={20} color="#004F9F" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
