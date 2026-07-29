import { Pressable, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from './comingSoon';
import { colors, spacing, typography } from '../theme';


export function BottomNav({ active }: { active: 'trips' }) {
  return (
    <View style={styles.bar}>
      <NavTab label="Home" isActive={false} onPress={() => comingSoon('Home feed')} />
      <NavTab label="Discover" isActive={false} onPress={() => comingSoon('Discover')} />
      <NavTab label="Trips" isActive={active === 'trips'} onPress={undefined} />
      <NavTab label="Profile" isActive={false} onPress={() => comingSoon('Profile')} />
    </View>
  );
}


function NavTab({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: (() => void) | undefined }) {
  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive, disabled: !isActive }}
    >
      <Text style={[styles.label, isActive ? styles.labelActive : styles.labelMuted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  label: { ...typography.caption },
  labelActive: { color: colors.accent, fontWeight: '700' },
  labelMuted: { color: colors.textSecondary },
});
