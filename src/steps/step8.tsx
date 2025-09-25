import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStep } from '../context/StepContext';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function Step8() {
  const { setCurrentStep } = useStep();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 18 + insets.top,
            paddingBottom: 10 + insets.bottom
          }}
        >
          {/* Logo */}
          <View className="items-center">
            <Animated.Image
              source={require('../../assets/logo.png')}
              style={{
                width: width * 0.5,
                height: width * 0.15,
              }}
              resizeMode="contain"
              entering={FadeIn.duration(800)}
            />
          </View>

          {/* Conteúdo Principal */}
          <View className="items-center">
            {/* Ícone de Sucesso */}
            <Animated.View 
              entering={FadeIn.duration(1000)}
              className="w-32 h-32 rounded-full items-center justify-center"
            >
              <View style={{ borderRadius: 100, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#004F9F', '#009FE3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-16 h-16 items-center justify-center"
                >
                  <Icon name="check" size={36} color="white" />
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Título */}
            <Animated.Text 
              entering={FadeInDown.duration(800).delay(200)}
              className="text-3xl font-bold text-gray-900 text-center mb-2"
            >
              Parabéns!
            </Animated.Text>

            {/* Mensagem Motivacional */}
            <Animated.Text 
              entering={FadeInDown.duration(800).delay(400)}
              className="text-lg text-gray-700 text-center"
            >
              Você concluiu a vistoria com excelência!
            </Animated.Text>

            <Animated.Text 
              entering={FadeInDown.duration(800).delay(500)}
              className="text-base text-gray-600 text-center mb-8"
            >
              Sua dedicação contribui para a segurança de todos.
            </Animated.Text>

            {/* Lista de Itens Concluídos */}
            <Animated.View 
              entering={FadeInDown.duration(800).delay(600)}
              className="w-full space-y-4 gap-2"
            >
              {/* Dados do Veículo */}
              <View className="bg-blue-50/50 rounded-2xl p-4">
                <View className="flex-row items-center">
                  <View style={{ borderRadius: 100, overflow: 'hidden', marginRight: 10 }}>
                    <LinearGradient
                      colors={['#004F9F', '#009FE3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="w-12 h-12 items-center justify-center"
                    >
                      <Icon name="directions-car" size={24} color="white" />
                    </LinearGradient>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Dados do veículo</Text>
                    <Text className="text-sm text-gray-600">Informações completas e precisas</Text>
                  </View>
                </View>
              </View>

              {/* Checklist */}
              <View className="bg-blue-50/50 rounded-2xl p-4">
                <View className="flex-row items-center">
                  <View style={{ borderRadius: 100, overflow: 'hidden', marginRight: 10 }}>
                    <LinearGradient
                      colors={['#004F9F', '#009FE3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="w-12 h-12 items-center justify-center"
                    >
                      <Icon name="checklist" size={24} color="white" />
                    </LinearGradient>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Checklist completo</Text>
                    <Text className="text-sm text-gray-600">Todos os itens verificados</Text>
                  </View>
                </View>
              </View>

              {/* Estado Geral */}
              <View className="bg-blue-50/50 rounded-2xl p-4">
                <View className="flex-row items-center">
                  <View style={{ borderRadius: 100, overflow: 'hidden', marginRight: 10 }}>
                    <LinearGradient
                      colors={['#004F9F', '#009FE3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="w-12 h-12 items-center justify-center"
                    >
                      <Icon name="star" size={24} color="white" />
                    </LinearGradient>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Estado geral</Text>
                    <Text className="text-sm text-gray-600">Avaliação detalhada</Text>
                  </View>
                </View>
              </View>

              {/* Fotos */}
              <View className="bg-blue-50/50 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center">
                  <View style={{ borderRadius: 100, overflow: 'hidden', marginRight: 10 }}>
                    <LinearGradient
                      colors={['#004F9F', '#009FE3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="w-12 h-12 items-center justify-center"
                    >
                      <Icon name="camera-alt" size={24} color="white" />
                    </LinearGradient>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-900">Fotos capturadas</Text>
                    <Text className="text-sm text-gray-600">Registro visual completo</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Mensagem Final */}
            <Animated.Text 
              entering={FadeInDown.duration(800).delay(800)}
              className="text-base text-gray-600 text-center mb-8"
            >
              O relatório será gerado e enviado para sua frota em instantes.
            </Animated.Text>
          </View>
        </ScrollView>
      </View>

      {/* Botão Voltar ao Início */}
      <View style={{
        position: 'absolute',
        bottom: insets.bottom + 16,
        left: 24,
        right: 24,
      }}>
        <View style={{ borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#004F9F', '#009FE3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setCurrentStep(0)}
              className="flex-row items-center justify-center py-4"
            >
              <Icon name="home" size={24} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white text-lg font-semibold">
                Voltar ao Início
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
} 