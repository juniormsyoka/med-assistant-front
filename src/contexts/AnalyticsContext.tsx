// src/contexts/AnalyticsContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalyticsContextType {
  lastUpdate: number;
  triggerRefresh: () => void;
}

export const AnalyticsContext = createContext<AnalyticsContextType>({
  lastUpdate: Date.now(),
  triggerRefresh: () => {},
});

export const useAnalyticsContext = () => useContext(AnalyticsContext);

interface Props {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<Props> = ({ children }) => {
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const triggerRefresh = () => {
    console.log('🔄 Analytics refresh triggered');
    setLastUpdate(Date.now());
  };

  return (
    <AnalyticsContext.Provider value={{ lastUpdate, triggerRefresh }}>
      {children}
    </AnalyticsContext.Provider>
  );
};