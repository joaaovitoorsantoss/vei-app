import React, { createContext, useContext, useState } from 'react';

interface StepContextData {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const StepContext = createContext<StepContextData>({} as StepContextData);

export function StepProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 8;

  return (
    <StepContext.Provider value={{ currentStep, setCurrentStep, totalSteps }}>
      {children}
    </StepContext.Provider>
  );
}

export function useStep() {
  const context = useContext(StepContext);

  if (!context) {
    throw new Error('useStep must be used within a StepProvider');
  }

  return context;
} 