// context/FeedbackContext.tsx
import React, { createContext, useContext, useState } from 'react';
import FeedbackBubble from '../components/homescreen/FeedbackBubble';
interface FeedbackContextType {
  showFeedback: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feedback, setFeedback] = useState<{
    message: string;
    visible: boolean;
    type: 'success' | 'warning' | 'info';
  }>({
    message: '',
    visible: false,
    type: 'info'
  });

  const showFeedback = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setFeedback({ message, visible: true, type });
  };

  const hideFeedback = () => {
    setFeedback(prev => ({ ...prev, visible: false }));
  };

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      <FeedbackBubble
        message={feedback.message}
        visible={feedback.visible}
        type={feedback.type}
        onHide={hideFeedback}
      />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
};