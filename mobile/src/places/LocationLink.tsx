import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import type { Pin } from '../maps/pinRules';
import { placeTapTarget } from '../maps/placeTap';
import { useOpenPlace } from '../maps/useOpenPlace';
import { locationLinkColors, locationLinkTypography } from '../theme/workspaceTokens';


export function LocationLink({
  place,
  destination,
  pin,
  style,
}: {
  place: string;
  destination: string | null;
  pin?: Pin | null;
  style?: StyleProp<TextStyle>;
}) {
  const open = useOpenPlace();
  const target = placeTapTarget(place, pin, destination);
  if (target === null) return null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={target.label}
      onPress={() => open(place, pin, destination)}
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
