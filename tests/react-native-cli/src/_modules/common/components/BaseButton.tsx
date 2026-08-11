import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '../../values/theme';

type BaseButtonVariant = 'primary' | 'secondary' | 'bordered' | 'light' | 'danger';
type BaseButtonSize = 'sm' | 'md' | 'lg';

interface BaseButtonProps {
  onPress: () => void;
  variant?: BaseButtonVariant;
  size?: BaseButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// In-house themed primitive — TouchableOpacity + theme tokens (ai/reactnative/02).
export default function BaseButton(props: PropsWithChildren<BaseButtonProps>) {
  const variant: BaseButtonVariant = props.variant ?? 'primary';
  const size: BaseButtonSize = props.size ?? 'md';
  const disabled = props.isDisabled || props.isLoading;

  return (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        disabled && styles.disabled,
        props.style,
      ]}>
      {props.isLoading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? Colors.primaryFg : Colors.primary} />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {props.children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
  },
  disabled: { opacity: 0.5 },

  variant_primary: { backgroundColor: Colors.primary },
  variant_secondary: { backgroundColor: Colors.secondary },
  variant_danger: { backgroundColor: Colors.danger },
  variant_bordered: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  variant_light: { backgroundColor: 'transparent' },

  size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  size_md: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  size_lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },

  label: { fontWeight: '600' },
  label_primary: { color: Colors.primaryFg },
  label_secondary: { color: Colors.white },
  label_danger: { color: Colors.primaryFg },
  label_bordered: { color: Colors.primary },
  label_light: { color: Colors.primary },

  labelSize_sm: { fontSize: FontSize.small },
  labelSize_md: { fontSize: FontSize.medium },
  labelSize_lg: { fontSize: FontSize.large },
});
