import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps, 
  StyleProp,
  View,
  //ReactNode
} from 'react-native';
import { ReactNode } from 'react';

// Define specific types for the new props
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';
type IconPosition = 'left' | 'right';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: IconPosition;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  ...rest
}) => {
  // Get styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: styles.buttonSecondary,
          text: styles.textSecondary,
          disabled: styles.buttonSecondaryDisabled
        };
      case 'outline':
        return {
          button: styles.buttonOutline,
          text: styles.textOutline,
          disabled: styles.buttonOutlineDisabled
        };
      case 'danger':
        return {
          button: styles.buttonDanger,
          text: styles.textDanger,
          disabled: styles.buttonDangerDisabled
        };
      default:
        return {
          button: styles.buttonPrimary,
          text: styles.textPrimary,
          disabled: styles.buttonPrimaryDisabled
        };
    }
  };

  // Get styles based on size
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: styles.buttonSmall,
          text: styles.textSmall
        };
      case 'large':
        return {
          button: styles.buttonLarge,
          text: styles.textLarge
        };
      default:
        return {
          button: styles.buttonMedium,
          text: styles.textMedium
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={variant === 'outline' ? '#4361EE' : '#FFF'} />;
    }

    return (
      <View style={styles.content}>
        {icon && iconPosition === 'left' && (
          <View style={styles.iconLeft}>
            {icon}
          </View>
        )}
        <Text style={[
          sizeStyles.text,
          variantStyles.text,
          textStyle,
          !!icon && styles.textWithIcon
        ]}>
          {title}
        </Text>
        {icon && iconPosition === 'right' && (
          <View style={styles.iconRight}>
            {icon}
          </View>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        variantStyles.button,
        sizeStyles.button,
        style,
        (loading || rest.disabled) && variantStyles.disabled
      ]}
      onPress={onPress}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Size variants
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  
  textSmall: {
    fontSize: 14,
    fontWeight: '600',
  },
  textMedium: {
    fontSize: 16,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Primary variant
  buttonPrimary: {
    backgroundColor: '#4361EE',
  },
  textPrimary: {
    color: '#FFF',
  },
  buttonPrimaryDisabled: {
    backgroundColor: '#9DB5FF',
  },
  
  // Secondary variant
  buttonSecondary: {
    backgroundColor: '#6C757D',
  },
  textSecondary: {
    color: '#FFF',
  },
  buttonSecondaryDisabled: {
    backgroundColor: '#ADB5BD',
  },
  
  // Outline variant
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4361EE',
  },
  textOutline: {
    color: '#4361EE',
  },
  buttonOutlineDisabled: {
    borderColor: '#9DB5FF',
    backgroundColor: 'transparent',
  },
  
  // Danger variant
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  textDanger: {
    color: '#FFF',
  },
  buttonDangerDisabled: {
    backgroundColor: '#FF9B95',
  },
  
  // Content layout
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  textWithIcon: {
    textAlign: 'center',
  },
});

export default PrimaryButton;