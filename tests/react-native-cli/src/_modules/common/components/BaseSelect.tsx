import { StyleSheet, TouchableOpacity } from 'react-native';

import Col from './Col';
import Row from './Row';
import TextPrimary from './TextPrimary';
import { Colors, FontSize, Radius, Spacing } from '../../values/theme';

interface SelectOption<V extends string> {
  label: string;
  value: V;
}

interface BaseSelectProps<V extends string> {
  label?: string;
  value: V;
  options: SelectOption<V>[];
  onChange: (value: V) => void;
}

// In-house segmented control for enum fields (custom field — wired via Controller
// in the form; ai/reactnative/05). Themed, no external UI dep.
export default function BaseSelect<V extends string>(props: BaseSelectProps<V>) {
  return (
    <Col style={styles.container}>
      {!!props.label && <TextPrimary text={props.label} style={styles.label} />}
      <Row style={styles.segment}>
        {props.options.map((option) => {
          const isActive = option.value === props.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.75}
              onPress={() => props.onChange(option.value)}
              style={[styles.option, isActive && styles.optionActive]}>
              <TextPrimary
                text={option.label}
                style={isActive ? styles.optionTextActive : styles.optionText}
              />
            </TouchableOpacity>
          );
        })}
      </Row>
    </Col>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.small, color: Colors.secondary },
  segment: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.small,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  optionActive: { backgroundColor: Colors.primary },
  optionText: { fontSize: FontSize.small, color: Colors.secondary },
  optionTextActive: { fontSize: FontSize.small, color: Colors.primaryFg, fontWeight: '600' },
});
