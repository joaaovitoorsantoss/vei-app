import React, { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';


interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(currentStep, {
      damping: 15,
      stiffness: 100,
      mass: 1
    });
  }, [currentStep]);


  return (
    <View className="flex-row items-center justify-center px-4 py-2">
      {/* Trilha do Carro */}
      <View className="flex-row items-center relative">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View key={index} className="flex-row items-center">
            {/* Ponto do Passo */}
            <View className="relative w-8 h-8 items-center justify-center">
              {index === currentStep ? (
                <Icon name="directions-car-filled" size={20} color="#004F9F" />
              ) : (
                <Icon 
                  name="circle" 
                  size={10} 
                  color={index < currentStep ? '#004F9F' : '#E5E7EB'} 
                />
              )}
            </View>

            {/* Linha Conectora */}
            {index < totalSteps - 1 && (
              <View className="w-4 h-[2px] bg-gray-200 mx-1" />
            )}
          </View>
        ))}

      
      </View>
    </View>
  );
} 