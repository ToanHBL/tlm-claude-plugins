import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { Colors, FontSize } from '../../values/theme';

// RN equivalent of the web `Text` component (ai/reactnative/02). Use instead of raw <Text>.
interface TextPrimaryProps {
  text: string | null | undefined;
  style?: StyleProp<TextStyle>;
  colon?: boolean;
  dot?: boolean;
  uppercase?: boolean;
  numberOfLines?: number;
}

export default function TextPrimary(props: TextPrimaryProps) {
  const display = props.uppercase ? props.text?.toUpperCase() : props.text;
  return (
    <Text style={[styles.text, props.style]} numberOfLines={props.numberOfLines}>
      {display ?? ''}
      {props.colon ? ': ' : ''}
      {props.dot ? '.' : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: FontSize.medium, color: Colors.foreground },
});
