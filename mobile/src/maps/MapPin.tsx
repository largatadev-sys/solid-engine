import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { mapColors, mapMetrics } from '../theme/workspaceTokens';


export function MapPin({
  style,
  label,
}: {
  readonly style?: StyleProp<ViewStyle>;
  readonly label?: string;
}) {
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={label}
      style={StyleSheet.flatten([styles.pin, style])}
    >
      <View style={styles.head} />
      <View style={styles.tip} />
    </View>
  );
}


const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: mapMetrics.pinWidth,
    height: mapMetrics.pinHeight,
    alignItems: 'center',
  },
  head: {
    width: mapMetrics.pinWidth,
    height: mapMetrics.pinWidth,
    borderRadius: mapMetrics.pinWidth,
    backgroundColor: mapColors.pinBody,
    borderWidth: mapMetrics.pinStrokeWidth,
    borderColor: mapColors.pinStroke,
  },
  tip: {
    width: mapMetrics.pinTipWidth,
    height: mapMetrics.pinHeight - mapMetrics.pinWidth,
    marginTop: -mapMetrics.pinTipInset,
    backgroundColor: mapColors.pinBody,
  },
});
