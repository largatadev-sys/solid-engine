import type { StyleProp, ViewStyle } from 'react-native';


export type WebOnlyStyle = {
  cursor?: 'grab' | 'grabbing';
  userSelect?: 'none';
  touchAction?: 'none';
  transitionProperty?: string;
  transitionDuration?: string;
};


export function webStyle(style: Omit<ViewStyle, 'cursor' | 'userSelect'> & WebOnlyStyle): StyleProp<ViewStyle> {
  return style as StyleProp<ViewStyle>;
}
