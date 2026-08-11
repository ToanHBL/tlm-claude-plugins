import { useEffect } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import {
  FieldValues,
  Path,
  PathValue,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';

import TextPrimary from './TextPrimary';
import Col from './Col';
import { Colors, FontSize, Radius, Spacing } from '../../values/theme';

interface BaseInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'onChangeText' | 'value' | 'defaultValue'> {
  name: Path<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  label?: string;
  defaultValue?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  onChangeText?: (text: string) => void;
}

// Register-first bridge (ai/reactnative/05): RN's TextInput fires onChangeText
// (a bare string), not a DOM event, so we register the field once and push edits
// back through setValue — screens stay register-style with no Controller.
export default function BaseInput<T extends FieldValues>(props: BaseInputProps<T>) {
  const {
    name,
    register,
    setValue,
    label,
    defaultValue,
    isInvalid,
    errorMessage,
    onChangeText,
    ...rest
  } = props;

  useEffect(() => {
    register(name);
  }, [name, register]);

  return (
    <Col style={styles.container}>
      {!!label && <TextPrimary text={label} style={styles.label} />}
      <TextInput
        defaultValue={defaultValue}
        placeholderTextColor={Colors.muted}
        onChangeText={(text) => {
          // setValue is typed against the whole form; text is always a string field here.
          setValue(name, text as PathValue<T, Path<T>>, {
            shouldValidate: true,
            shouldDirty: true,
          });
          onChangeText?.(text);
        }}
        style={[styles.input, isInvalid && styles.inputInvalid]}
        {...rest}
      />
      {!!isInvalid && !!errorMessage && (
        <TextPrimary text={errorMessage} style={styles.error} />
      )}
    </Col>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.small, color: Colors.secondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.medium,
    color: Colors.foreground,
  },
  inputInvalid: { borderColor: Colors.danger },
  error: { fontSize: FontSize.tiny, color: Colors.danger },
});
