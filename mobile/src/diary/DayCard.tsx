import { StyleSheet, Text, View } from 'react-native';
import type { Pin } from '../maps/pinRules';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { MemoryField } from './MemoryField';
import { MemoryPlaceField } from './MemoryPlaceField';
import {
  DAY_ADD_PHOTO,
  DAY_CAPTION_LABEL,
  DAY_PHOTOS_LABEL,
  DAY_PLACE_LABEL,
  DAY_PLACE_PLACEHOLDER,
  photoCountLabel,
} from './memoryCopy';
import { PhotoTiles } from './PhotoTiles';


interface DayCardProps {
  readonly heading?: string;
  readonly ordinal: number;
  readonly place: string;
  readonly pin: Pin | null;
  readonly caption: string;
  readonly photos: readonly PickedPhoto[];
  readonly editable?: boolean;
  readonly onPlace: (place: string, pin: Pin | null) => void;
  readonly onCaption: (caption: string) => void;
  readonly onAddPhotos: () => void;
  readonly onRemovePhoto: (index: number) => void;
  readonly onLeave?: () => void;
}


export function DayCard({
  heading,
  ordinal,
  place,
  pin,
  caption,
  photos,
  editable = true,
  onPlace,
  onCaption,
  onAddPhotos,
  onRemovePhoto,
  onLeave,
}: DayCardProps) {
  return (
    <View style={styles.card}>
      {heading !== undefined && <Text style={styles.heading}>{heading}</Text>}

      <MemoryPlaceField
        label={DAY_PLACE_LABEL}
        height={memoryMetrics.placeFieldHeight}
        value={place}
        pin={pin}
        openNear={pin}
        editable={editable}
        placeholder={DAY_PLACE_PLACEHOLDER}
        accessibilityLabel={`${DAY_PLACE_LABEL} ${ordinal}`}
        onPicked={(picked, droppedPin) => {
          onPlace(picked, droppedPin);
          onLeave?.();
        }}
      />

      <View style={styles.photos}>
        <View style={styles.photosHead}>
          <Text style={styles.label}>{DAY_PHOTOS_LABEL}</Text>
          <Text style={styles.counter}>
            {photoCountLabel(photos.length, memoryMetrics.photosPerPostcard)}
          </Text>
        </View>
        <PhotoTiles
          photos={photos}
          limit={memoryMetrics.photosPerPostcard}
          addLabel={`${DAY_ADD_PHOTO} ${ordinal}`}
          onAdd={onAddPhotos}
          onRemove={onRemovePhoto}
        />
      </View>

      <MemoryField
        label={DAY_CAPTION_LABEL}
        area
        minHeight={memoryMetrics.captionMin}
        value={caption}
        onChangeText={onCaption}
        onBlur={onLeave}
        editable={editable}
        accessibilityLabel={`${DAY_CAPTION_LABEL} ${ordinal}`}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.cardRadius,
    padding: memoryMetrics.cardPadding,
    gap: memoryMetrics.cardGap,
    backgroundColor: memoryColors.card,
  },
  heading: {
    ...memoryTypography.dayTitle,
    color: memoryColors.title,
  },
  photos: {
    gap: 8,
  },
  photosHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    ...memoryTypography.fieldLabel,
    color: memoryColors.label,
  },
  counter: {
    ...memoryTypography.counter,
    color: memoryColors.faint,
  },
});
