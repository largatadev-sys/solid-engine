import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useExitGuard } from '../navigation/useExitGuard';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import type { PostcardResponse } from '../types/api';
import { askMemoryConfirmation } from './MemoryConfirm';
import { MemoryCta } from './MemoryCta';
import { MemoryField } from './MemoryField';
import { MemoryHeader } from './MemoryHeader';
import {
  DISCARD_ACTION,
  DISCARD_CHANGES_BODY,
  DISCARD_CHANGES_TITLE,
  EDIT_CAPTION_TITLE,
  KEEP_EDITING_ACTION,
  POSTCARD_CAPTION_LABEL,
  SAVE_CTA,
  SAVE_FAILED,
} from './memoryCopy';


interface EditCaptionScreenProps {
  readonly postcard: PostcardResponse;
  readonly onSaved: (postcard: PostcardResponse) => void;
}


export function EditCaptionScreen({ postcard, onSaved }: EditCaptionScreenProps) {
  const [caption, setCaption] = useState(postcard.caption ?? '');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const trimmed = caption.trim();
  const dirty = !saved && trimmed !== (postcard.caption ?? '');

  useExitGuard(dirty, (proceed) => {
    askMemoryConfirmation(
      {
        title: DISCARD_CHANGES_TITLE,
        body: DISCARD_CHANGES_BODY,
        confirmLabel: DISCARD_ACTION,
        cancelLabel: KEEP_EDITING_ACTION,
      },
      proceed,
    );
  });

  async function save(): Promise<void> {
    if (!dirty) return;

    setSaving(true);
    setFailed(false);
    try {
      const next = await memoryRepository.recaptionPostcard(
        postcard.id,
        trimmed === '' ? null : trimmed,
      );
      setSaved(true);
      onSaved(next);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MemoryHeader pill="POSTCARD" title={EDIT_CAPTION_TITLE} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <MemoryField
          label={POSTCARD_CAPTION_LABEL}
          area
          minHeight={memoryMetrics.postcardCaptionMin}
          value={caption}
          onChangeText={setCaption}
          editable={!saving}
          autoFocus
        />
      </ScrollView>

      <View style={styles.rail}>
        <MemoryCta label={SAVE_CTA} disabled={!dirty} busy={saving} onPress={() => void save()} />
        {failed && <Text style={styles.failed}>{SAVE_FAILED}</Text>}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  body: {
    paddingHorizontal: memoryMetrics.screenPadding,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  rail: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
    backgroundColor: memoryColors.screen,
  },
  failed: {
    ...memoryTypography.meta13,
    color: memoryColors.danger,
    paddingHorizontal: memoryMetrics.screenPadding,
  },
});
