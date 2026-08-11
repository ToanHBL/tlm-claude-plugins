import { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

// Structural flex-row container — use instead of raw <View>.
export default function Row(
  props: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>,
) {
  return <View style={[{ flexDirection: 'row' }, props.style]}>{props.children}</View>;
}
