import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import { profileColors, profileTypography } from '../theme/workspaceTokens';
import { PROFILE_ITINERARIES_EMPTY } from './profileCopy';


export function ProfileItinerariesTab() {
  return (
    <View style={styles.pane}>
      <Text style={styles.empty}>{PROFILE_ITINERARIES_EMPTY}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  empty: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
});
