import { StyleSheet, View } from 'react-native';
import { MOBILE_FRAME_WIDTH, type MobileFrameProps } from './mobileFrameContract';
import { colors } from '../theme';


export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <View style={styles.page}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceMuted },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: colors.background,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
