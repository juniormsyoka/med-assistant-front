import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';

interface TextInputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  error,
  containerStyle,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : null, textInputProps.style]}
        placeholderTextColor="#A0A0A0"
        {...textInputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30', // Red for error
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default TextInputField;