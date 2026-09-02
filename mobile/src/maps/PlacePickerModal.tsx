import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { spacing } from '../theme';
import {
  mapColors,
  mapMetrics,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
} from '../theme/workspaceTokens';
import { useMapConfig, usePlaceSearch } from '../query/placeQueries';
import type { PlaceCandidateResponse } from '../types/api';
import {
  DROP_PIN_HINT,
  MAP_UNAVAILABLE,
  PICKER_CANCEL,
  PICKER_CONFIRM,
  PICKER_NEEDS_LABEL,
  PICKER_REMOVE,
  PICKER_TITLE,
  PLACE_LABEL,
  SEARCH_NO_RESULTS,
  SEARCH_PLACEHOLDER,
  SEARCH_UNAVAILABLE,
  resultLabel,
} from './mapCopy';
import { pinConfirmable, type Pin } from './pinRules';
import { TileSurface } from './TileSurface';
import { clampZoom, type LatLng } from './tileProjection';


const SHEET_MAX_WIDTH = 420;

const DROPPED_ZOOM = 16;

const REGION_ZOOM = 12;

const WORLD_CENTRE: LatLng = { lat: 12.8797, lng: 121.774 };


export interface PickedPlace {
  readonly place: string;
  readonly pin: Pin | null;
}


interface PlacePickerModalProps {
  readonly visible: boolean;
  readonly place: string;
  readonly pin: Pin | null;
  readonly openNear: Pin | null;
  readonly onConfirm: (picked: PickedPlace) => void;
  readonly onDismiss: () => void;
}


export function PlacePickerModal({
  visible,
  place,
  pin,
  openNear,
  onConfirm,
  onDismiss,
}: PlacePickerModalProps) {
  const config = useMapConfig();

  const [label, setLabel] = useState(place);
  const [dropped, setDropped] = useState<Pin | null>(pin);
  const [view, setView] = useState(() => openingView(pin, openNear));
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setLabel(place);
    setDropped(pin);
    setView(openingView(pin, openNear));
    setQuery('');
  }, [visible, place, pin, openNear]);

  const bias = biasFrom(pin, openNear);
  const results = usePlaceSearch(query, bias);

  const accept = (candidate: PlaceCandidateResponse) => {
    const landed: Pin = { lat: candidate.lat, lng: candidate.lng, zoom: DROPPED_ZOOM };
    setLabel(candidate.name);
    setDropped(landed);
    setView({ centre: landed, zoom: DROPPED_ZOOM });
    setQuery('');
  };

  const dropHere = () => setDropped({ ...view.centre, zoom: clampZoom(view.zoom) });

  const confirmable = pinConfirmable(dropped, label) || (dropped === null && label.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{PICKER_TITLE}</Text>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={workspaceColors.placeholder}
            accessibilityLabel={SEARCH_PLACEHOLDER}
            autoCorrect={false}
          />

          {results.isError ? <Text style={styles.notice}>{SEARCH_UNAVAILABLE}</Text> : null}

          {results.data !== undefined && results.data.results.length === 0 ? (
            <Text style={styles.notice}>{SEARCH_NO_RESULTS}</Text>
          ) : null}

          {results.data !== undefined && results.data.results.length > 0 ? (
            <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
              {results.data.results.map((candidate) => (
                <Pressable
                  key={`${candidate.name}/${candidate.lat}/${candidate.lng}`}
                  accessibilityRole="button"
                  accessibilityLabel={resultLabel(candidate.name, candidate.context)}
                  onPress={() => accept(candidate)}
                  style={styles.result}
                >
                  <Text style={styles.resultName} numberOfLines={1}>
                    {candidate.name}
                  </Text>
                  {candidate.context === null ? null : (
                    <Text style={styles.resultContext} numberOfLines={1}>
                      {candidate.context}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.stage}>
            {config.data === undefined ? (
              <View style={styles.waiting}>
                {config.isError ? (
                  <Text style={styles.notice}>{MAP_UNAVAILABLE}</Text>
                ) : (
                  <ActivityIndicator color={workspaceColors.accent} />
                )}
              </View>
            ) : (
              <TileSurface
                config={config.data}
                centre={view.centre}
                zoom={view.zoom}
                pin={dropped}
                onMove={(centre, zoom) => setView({ centre, zoom })}
              >
                <View style={styles.crosshair} pointerEvents="none">
                  <View style={styles.crosshairBar} />
                  <View style={styles.crosshairPost} />
                </View>
              </TileSurface>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={DROP_PIN_HINT}
            onPress={dropHere}
            style={styles.dropHere}
          >
            <Text style={styles.dropHereText}>{DROP_PIN_HINT}</Text>
          </Pressable>

          <TextInput
            style={styles.label}
            value={label}
            onChangeText={setLabel}
            placeholder={PLACE_LABEL}
            placeholderTextColor={workspaceColors.placeholder}
            accessibilityLabel={PLACE_LABEL}
          />

          {dropped !== null && label.trim().length === 0 ? (
            <Text style={styles.notice}>{PICKER_NEEDS_LABEL}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={PICKER_CANCEL}
              onPress={onDismiss}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{PICKER_CANCEL}</Text>
            </Pressable>

            {dropped === null ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={PICKER_REMOVE}
                onPress={() => setDropped(null)}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{PICKER_REMOVE}</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={PICKER_CONFIRM}
              accessibilityState={{ disabled: !confirmable }}
              disabled={!confirmable}
              onPress={() => onConfirm({ place: label.trim(), pin: dropped })}
              style={StyleSheet.flatten([styles.primary, !confirmable && styles.primarySpent])}
            >
              <Text style={styles.primaryText}>{PICKER_CONFIRM}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


function openingView(pin: Pin | null, openNear: Pin | null): { centre: LatLng; zoom: number } {
  if (pin !== null) return { centre: pin, zoom: clampZoom(pin.zoom) };
  if (openNear !== null) return { centre: openNear, zoom: REGION_ZOOM };

  return { centre: WORLD_CENTRE, zoom: 6 };
}


function biasFrom(pin: Pin | null, openNear: Pin | null): { lat: number; lng: number } | null {
  const near = pin ?? openNear;
  return near === null ? null : { lat: near.lat, lng: near.lng };
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: workspaceColors.sheetScrim,
  },
  sheet: {
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: workspaceRadii.sheet,
    borderTopRightRadius: workspaceRadii.sheet,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: '92%',
  },
  title: { color: workspaceColors.title },
  search: {
    height: mapMetrics.searchBoxHeight,
    borderWidth: 1,
    borderColor: workspaceColors.inputBorder,
    borderRadius: workspaceRadii.control,
    paddingHorizontal: spacing.sm,
    color: workspaceColors.title,
  },
  results: { maxHeight: mapMetrics.resultRowHeight * 3 },
  result: {
    minHeight: mapMetrics.resultRowHeight,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: mapColors.resultDivider,
  },
  resultName: { color: workspaceColors.title },
  resultContext: { color: workspaceColors.muted },
  stage: { height: 280, borderRadius: workspaceRadii.card, overflow: 'hidden' },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  crosshair: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: mapMetrics.crosshairSize,
    height: mapMetrics.crosshairSize,
    marginLeft: -mapMetrics.crosshairSize / 2,
    marginTop: -mapMetrics.crosshairSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairBar: {
    position: 'absolute',
    width: mapMetrics.crosshairSize,
    height: mapMetrics.crosshairStroke,
    backgroundColor: mapColors.crosshair,
  },
  crosshairPost: {
    position: 'absolute',
    width: mapMetrics.crosshairStroke,
    height: mapMetrics.crosshairSize,
    backgroundColor: mapColors.crosshair,
  },
  dropHere: {
    height: workspaceMetrics.secondaryCtaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.pressed,
  },
  dropHereText: { color: workspaceColors.title },
  label: {
    height: workspaceMetrics.inputHeight,
    borderWidth: 1,
    borderColor: workspaceColors.inputBorder,
    borderRadius: workspaceRadii.control,
    paddingHorizontal: spacing.sm,
    color: workspaceColors.title,
  },
  notice: { color: workspaceColors.muted },
  actions: { flexDirection: 'row', gap: spacing.xs },
  secondary: {
    flex: 1,
    height: workspaceMetrics.sheetCtaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: workspaceRadii.control,
    borderWidth: 1,
    borderColor: workspaceColors.railBorder,
  },
  secondaryText: { color: workspaceColors.title },
  primary: {
    flex: 1,
    height: workspaceMetrics.sheetCtaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
  },
  primarySpent: { opacity: 0.4 },
  primaryText: { color: workspaceColors.onAccent },
});
