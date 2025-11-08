// components/AnimatedFloatingButton.tsx
import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface AnimatedFloatingButtonProps {
  onPress: () => void;
}

const AnimatedFloatingButton: React.FC<AnimatedFloatingButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Scale animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotate animation for smooth transition
    Animated.spring(rotateAnim, {
      toValue: isOpen ? 0 : 1,
      useNativeDriver: true,
    }).start();

    setIsOpen(!isOpen);
    onPress();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'], // Rotate 180 degrees for arrow flip
  });

  // Choose icon based on drawer state
  const getIconName = () => {
  //return isOpen ?  'arrow-back' : 'menu';
return'menu'
};



  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          shadowColor: colors.primary,
        }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          { 
            backgroundColor: colors.primary,
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons 
            name='menu' 
            size={24} 
            color="white" 
          />
        </Animated.View>
      </TouchableOpacity>
      
      
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 0,
    //top: 60, // Below status bar
   // right: 20, // Away from scroll indicators
    zIndex: 1000,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    opacity: 0.95,
  },
  tooltip: {
    position: 'absolute',
    top: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AnimatedFloatingButton;