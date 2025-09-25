import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, TouchableOpacityProps, StyleProp } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
   style?: StyleProp<ViewStyle>;      // ✅ allows array, null, undefined
  textStyle?: StyleProp<TextStyle>; 
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  style,
  textStyle,
  ...rest // Capture other TouchableOpacity props
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style, (loading || rest.disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4361EE', // A nice, professional blue
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonDisabled: {
    backgroundColor: '#9DB5FF', // Lighter, disabled state
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrimaryButton;