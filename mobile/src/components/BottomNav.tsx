import { Pressable, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from './comingSoon';
import { colors, spacing, typography } from '../theme';

/**
 * The four-tab bottom nav (S1.3, ticket 05, the 07/18 mock's bottom-nav) — Home · Discover · Trips ·
 * Profile.
 *
 * <strong>Only Trips is live.</strong> Home (the E4 feed), Discover (S4.3), and Profile (the
 * onboarding work) have no screens yet, so their tabs render **disabled and answer a tap with a
 * graceful message** (the S0.5 pattern via `comingSoon`) — never a dead tap, and never a route to a
 * screen that does not exist. The nav's *shape* is the mock's; its live surface is what has shipped.
 *
 * Dead chrome until E4, accepted knowingly (the founder's grey-out ruling). Rendered on My Trips, the
 * signed-in home — the one top-level destination that exists. Built on theme tokens, never the mock's
 * palette (the pre-E4 visual-direction decision is not this ticket's to make).
 *
 * @param active which tab is the current screen — the only one drawn in the accent colour
 */
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

/**
 * One tab. The active tab (Trips) has no `onPress` — you are already here — and draws in the accent
 * colour. A future tab carries its `comingSoon` handler and is muted, with an accessibility state of
 * disabled, so a screen reader announces it as unavailable rather than merely quiet.
 */
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
