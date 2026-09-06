import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { PlacePickerModal } from '../maps/PlacePickerModal';
import { placeFieldLabel } from '../maps/mapCopy';
import type { Pin } from '../maps/pinRules';
import { MemoryField } from './MemoryField';


interface MemoryPlaceFieldProps {
  readonly label: string;
  readonly value: string;
  readonly pin: Pin | null;
  readonly openNear: Pin | null;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly glyph?: boolean;
  readonly height?: number;
  readonly editable?: boolean;
  readonly accessibilityLabel?: string;
  readonly onPicked: (place: string, pin: Pin | null) => void;
}


export function MemoryPlaceField({
  label,
  value,
  pin,
  openNear,
  placeholder,
  required,
  glyph = false,
  height,
  editable = true,
  accessibilityLabel,
  onPicked,
}: MemoryPlaceFieldProps) {
  const [picking, setPicking] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? placeFieldLabel(value)}
        disabled={!editable}
        onPress={() => setPicking(true)}
      >
        <View pointerEvents="none">
          <MemoryField
            label={label}
            required={required}
            height={height}
            icon={glyph ? 'pin' : undefined}
            value={value}
            placeholder={placeholder}
            editable={false}
          />
        </View>
      </Pressable>

      <PlacePickerModal
        visible={picking}
        place={value}
        pin={pin}
        openNear={openNear}
        onConfirm={(picked) => {
          onPicked(picked.place, picked.pin);
          setPicking(false);
        }}
        onDismiss={() => setPicking(false)}
      />
    </>
  );
}
