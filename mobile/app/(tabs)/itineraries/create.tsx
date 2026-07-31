import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../../../src/components/comingSoon';
import { Icon, type IconName } from '../../../src/components/Icon';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { colors, radii, spacing, typography } from '../../../src/theme';


export default function CreateTripScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Create a Trip" size="display" back />

      <View style={styles.choices}>
        <Choice
          icon="filePlus"
          title="Start from Scratch"
          detail="Build your itinerary step by step"
          onPress={() => router.replace('/itineraries/new')}
        />
        {}
        <Choice
          icon="gitBranch"
          title="Fork an Existing Itinerary"
          detail="Start from a published trip and make it yours"
          greyed
          onPress={() => comingSoon('fork')}
        />
      </View>
    </ScrollView>
  );
}


function Choice({
  icon,
  title,
  detail,
  greyed = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  greyed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choice, greyed && styles.choiceGreyed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: greyed }}
      accessibilityLabel={greyed ? `${title}, coming soon` : title}
    >
      <View style={styles.tile}>
        <Icon name={icon} size={TILE_ICON_SIZE} color={colors.accent} />
      </View>
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const TILE_SIZE = 48;

const TILE_ICON_SIZE = 24;

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  choices: { gap: spacing.md },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceGreyed: { opacity: 0.7 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: { flex: 1, gap: spacing.xs },
  choiceTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  choiceDetail: { ...typography.caption, color: colors.textSecondary },
});
