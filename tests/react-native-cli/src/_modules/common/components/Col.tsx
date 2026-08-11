import { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

// Structural flex-column container — use instead of raw <View>.
export default function Col(
  props: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>,
) {
  return <View style={[{ flexDirection: 'column' }, props.style]}>{props.children}</View>;
}
