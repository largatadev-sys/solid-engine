import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { useSafeBack, type BackTarget } from '../navigation/safeBack';
import { colors, radii, spacing, typography } from '../theme';


type HeaderSize = 'display' | 'title' | 'heading';


export function ScreenHeader({
  title,
  size = 'title',
  back = false,
  backTo,
  eyebrow,
  action,
}: {
  title: string;
  size?: HeaderSize;
  back?: boolean;

  backTo?: BackTarget;
  eyebrow?: ReactNode;
  action?: ReactNode;
}) {
  const goBack = useSafeBack(backTo);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.block, { paddingTop: insets.top }]}>
      {eyebrow}
      <View style={styles.row}>
        {back && (
          <Pressable
            style={styles.backButton}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="back" size={BACK_ICON_SIZE} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={[styles.title, TITLE_STYLES[size]]} numberOfLines={2}>
          {title}
        </Text>
        {action}
      </View>
    </View>
  );
}

const BACK_BUTTON_SIZE = 36;

const BACK_ICON_SIZE = 20;

const TITLE_STYLES = {
  display: typography.display,
  title: typography.title,
  heading: typography.heading,
};

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.textPrimary, flex: 1 },
});
