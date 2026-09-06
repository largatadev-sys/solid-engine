import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOpenPlace } from '../maps/useOpenPlace';
import { placeTapTarget } from '../maps/placeTap';
import type { Pin } from '../maps/pinRules';
import { memoryColors, memoryMotion } from '../theme/memoryTokens';
import { MemoryIcon } from './MemoryIcon';


interface MemoryPlaceLinkProps {
  readonly place: string;
  readonly pin: Pin | null;
  readonly destination?: string | null;
  readonly glyph?: number;
  readonly tint?: string;
  readonly style?: object;
}


export function MemoryPlaceLink({
  place,
  pin,
  destination = null,
  glyph,
  tint = memoryColors.muted,
  style,
}: MemoryPlaceLinkProps) {
  const open = useOpenPlace();
  const target = placeTapTarget(place, pin, destination);

  if (target === null) {
    return <Text style={style}>{place}</Text>;
  }

  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([styles.row, pressed ? styles.pressed : null])
      }
      accessibilityRole="link"
      accessibilityLabel={target.label}
      onPress={() => open(place, pin, destination)}
    >
      {glyph !== undefined && (
        <MemoryIcon name="pin" size={glyph} color={tint} strokeWidth={2.2} />
      )}
      <Text style={style} numberOfLines={1}>
        {place}
      </Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
