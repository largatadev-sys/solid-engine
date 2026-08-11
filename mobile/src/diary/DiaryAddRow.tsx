import { View } from 'react-native';
import { DiaryAddTile } from './DiaryPhotoTile';
import { ADD_FROM_CAMERA_ROLL, PICK_FROM_DUMP } from './diaryCopy';
import { diaryEditorStyles as styles } from './diaryEditorStyles';


interface DiaryAddRowProps {
  readonly full: boolean;
  readonly onPickFromDevice: () => void;
  readonly onOpenDump: () => void;
}


export function DiaryAddRow({ full, onPickFromDevice, onOpenDump }: DiaryAddRowProps) {
  return (
    <View style={styles.addRow}>
      <DiaryAddTile
        label={ADD_FROM_CAMERA_ROLL}
        accessibilityLabel="Add a photo from your camera roll"
        disabled={full}
        onPress={onPickFromDevice}
      />
      <DiaryAddTile
        label={PICK_FROM_DUMP}
        accessibilityLabel="Add a photo from the Photo Dump"
        emphasis="dump"
        disabled={full}
        onPress={onOpenDump}
      />
    </View>
  );
}
