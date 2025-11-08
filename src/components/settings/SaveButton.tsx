import React from 'react';
import { View, StyleSheet } from 'react-native';
import PrimaryButton from '../homescreen/PrimaryButton';

interface SaveButtonProps {
  onPress: () => void;
  loading: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onPress, loading }) => {
  return (
    <View style={styles.saveButtonContainer}>
      <PrimaryButton title="Save Settings" onPress={onPress} loading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  saveButtonContainer: {
    padding: 16,
    backgroundColor: 'transparent',
  },
});

export default SaveButton;
