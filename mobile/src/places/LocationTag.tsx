import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { spacing } from '../theme';
import { feedColors, feedMetrics, feedTypography } from '../theme/feedTokens';
import { mapsLinkLabel, mapsUrl } from './mapsQuery';
import { openInMaps } from './openInMaps';


export function LocationTag({
  place,
  destination,
}: {
  place: string | null;
  destination: string | null;
}) {
  const url = place === null ? undefined : mapsUrl(place, destination);
  if (place === null || url === undefined) return null;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => openInMaps(url)}
        accessibilityRole="link"
        accessibilityLabel={mapsLinkLabel(place)}
      >
        {({ pressed }) => (
          <View style={StyleSheet.flatten([styles.tag, pressed && styles.tagPressed])}>
            <Icon
              name="mapPin"
              size={feedMetrics.tagGlyph}
              color={pressed ? feedColors.tagInkPressed : feedColors.tagInk}
            />
            <Text
              style={StyleSheet.flatten([styles.label, pressed && styles.labelPressed])}
              numberOfLines={1}
            >
              {place}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: feedMetrics.chipPaddingY,
    backgroundColor: feedColors.tagWell,
    borderRadius: feedMetrics.chipRadius,
    maxWidth: '100%',
  },
  tagPressed: { backgroundColor: feedColors.tagWellPressed },
  label: {
    ...feedTypography.tag,
    color: feedColors.tagInk,
    flexShrink: 1,
  },
  labelPressed: { color: feedColors.tagInkPressed },
});
