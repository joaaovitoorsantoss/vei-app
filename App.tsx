import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import './global.css';
import { API_URL, PROJECT_NAME, PROJECT_VERSION } from '@env';
import { StepProvider, useStep } from './src/context/StepContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VistoriaProvider } from './src/context/VistoriaContext';
import SplashScreen from './src/components/SplashScreen';
import Step1 from './src/steps/step1';
import Step2 from './src/steps/step2';
import Step3 from './src/steps/step3';
import Step4 from './src/steps/step4';
import Step5 from './src/steps/step5';
import Step6 from './src/steps/step6';
import Step7 from './src/steps/step7';
import Step8 from './src/steps/step8';
import CheckIn from './src/steps/checkin';
function AppContent() {
  const { currentStep } = useStep();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  try {
    switch (currentStep) {
      case 0:
        return <Step1 />;
      case 1:
        return <Step2 />;
      case 2:
        return <Step3 />;
      case 3:
        return <Step4 />;
      case 4:
        return <Step5 />;
      case 5:
        return <Step6 />;
      case 6:
        return <Step7 />;
      case 7:
        return <Step8 />;
      case 'checkin':
        return <CheckIn />;
      default:
        return <Step1 />;
    }
  } catch (error) {
    console.error('Erro ao carregar o componente:', error);
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <VistoriaProvider>
        <StepProvider>
          <StatusBar 
            barStyle="dark-content"
            translucent
            backgroundColor="transparent"
          />
          <AppContent />
        </StepProvider>
      </VistoriaProvider>
    </SafeAreaProvider>
  );
}
