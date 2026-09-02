import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { locationLinkColors, locationLinkTypography } from '../theme/workspaceTokens';
import { mapsLinkLabel, mapsUrl } from './mapsQuery';
import { openInMaps } from './openInMaps';


export function LocationLink({
  place,
  destination,
  style,
}: {
  place: string;
  destination: string | null;
  style?: StyleProp<TextStyle>;
}) {
  const url = mapsUrl(place, destination);
  if (url === undefined) return null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={mapsLinkLabel(place)}
      onPress={() => openInMaps(url)}
    >
      {({ pressed }) => (
        <Text
          numberOfLines={1}
          style={StyleSheet.flatten([
            style,
            styles.link,
            pressed && styles.linkPressed,
          ])}
        >
          {place}
        </Text>
      )}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  link: { ...locationLinkTypography.link, color: locationLinkColors.link },
  linkPressed: { color: locationLinkColors.linkPressed },
});
