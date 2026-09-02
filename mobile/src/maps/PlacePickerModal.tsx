import { useEffect, useRef, useState } from 'react';
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
  workspaceTypography,
} from '../theme/workspaceTokens';
import { nameForPin, useMapConfig, usePlaceSearch } from '../query/placeQueries';
import type { PlaceCandidateResponse } from '../types/api';
import {
  MAP_UNAVAILABLE,
  MOVE_THE_MAP,
  PICKER_CANCEL,
  PICKER_CONFIRM,
  PICKER_NEEDS_LABEL,
  PICKER_REMOVE,
  PIN_AT_CENTRE,
  PLACE_LABEL,
  RESOLVING_PLACE,
  SEARCH_NO_RESULTS,
  SEARCH_PLACEHOLDER,
  SEARCH_UNAVAILABLE,
  resultLabel,
} from './mapCopy';
import {
  detailFrom,
  headlineFor,
  movedAwayFrom,
  nameToSave,
  needsTyping,
  type PickedDetail,
} from './pickedPlace';
import type { Pin } from './pinRules';
import { TileSurface } from './TileSurface';
import { clampZoom, type LatLng } from './tileProjection';


const SHEET_MAX_WIDTH = 420;

const PICKED_ZOOM = 16;

const REGION_ZOOM = 12;

const SETTLE_MS = 450;

const STAGE_HEIGHT = 340;

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

  const [view, setView] = useState(() => openingView(pin, openNear));
  const [detail, setDetail] = useState<PickedDetail | null>(null);
  const [typed, setTyped] = useState('');
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');

  const exactAt = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!visible) return;

    const named = place.trim();
    setView(openingView(pin, openNear));
    setDetail(named === '' ? null : { name: named, kind: null, context: null, exact: true });
    exactAt.current = pin;
    setTyped('');
    setResolving(false);
    setQuery('');
  }, [visible, place, pin, openNear]);

  useEffect(() => {
    if (!visible) return;
    if (!movedAwayFrom(exactAt.current, view.centre)) return;

    let live = true;
    setResolving(true);

    const timer = setTimeout(() => {
      void nameForPin(view.centre.lat, view.centre.lng).then((found) => {
        if (!live) return;
        exactAt.current = null;
        setDetail(detailFrom(found ?? null, false));
        setResolving(false);
      });
    }, SETTLE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [visible, view.centre]);

  const accept = (candidate: PlaceCandidateResponse) => {
    const landed: LatLng = { lat: candidate.lat, lng: candidate.lng };
    exactAt.current = landed;
    setDetail(detailFrom(candidate, true));
    setView({ centre: landed, zoom: PICKED_ZOOM });
    setResolving(false);
    setTyped('');
    setQuery('');
  };

  const mustType = needsTyping(detail, typed) && !resolving;
  const confirmable = !resolving && nameToSave(detail, typed).trim() !== '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={workspaceColors.placeholder}
            accessibilityLabel={SEARCH_PLACEHOLDER}
            autoCorrect={false}
          />

          <Results query={query} bias={view.centre} onAccept={accept} />

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
                onMove={(centre, zoom) => setView({ centre, zoom })}
              >
                <View
                  style={styles.centrePin}
                  pointerEvents="none"
                  accessibilityLabel={PIN_AT_CENTRE}
                >
                  <View style={styles.pinHead} />
                  <View style={styles.pinTip} />
                </View>
              </TileSurface>
            )}
          </View>

          <View style={styles.detail}>
            <Text style={styles.headline} numberOfLines={1}>
              {resolving ? RESOLVING_PLACE : headlineFor(detail, typed)}
            </Text>
            <Text style={styles.context} numberOfLines={1}>
              {resolving ? '' : (detail?.context ?? MOVE_THE_MAP)}
            </Text>
          </View>

          {mustType ? (
            <>
              <Text style={styles.notice}>{PICKER_NEEDS_LABEL}</Text>
              <TextInput
                style={styles.label}
                value={typed}
                onChangeText={setTyped}
                placeholder={PLACE_LABEL}
                placeholderTextColor={workspaceColors.placeholder}
                accessibilityLabel={PLACE_LABEL}
              />
            </>
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={PICKER_CONFIRM}
              accessibilityState={{ disabled: !confirmable }}
              disabled={!confirmable}
              onPress={() =>
                onConfirm({
                  place: nameToSave(detail, typed),
                  pin: { lat: view.centre.lat, lng: view.centre.lng, zoom: clampZoom(view.zoom) },
                })
              }
              style={StyleSheet.flatten([styles.primary, !confirmable && styles.primarySpent])}
            >
              <Text style={styles.primaryText}>{PICKER_CONFIRM}</Text>
            </Pressable>
          </View>

          {pin === null ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={PICKER_REMOVE}
              onPress={() => onConfirm({ place: '', pin: null })}
              style={styles.remove}
            >
              <Text style={styles.removeText}>{PICKER_REMOVE}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}


function Results({
  query,
  bias,
  onAccept,
}: {
  readonly query: string;
  readonly bias: LatLng;
  readonly onAccept: (candidate: PlaceCandidateResponse) => void;
}) {
  const results = usePlaceSearch(query, { lat: bias.lat, lng: bias.lng });

  if (query.trim() === '') return null;

  if (results.isError) return <Text style={styles.notice}>{SEARCH_UNAVAILABLE}</Text>;

  if (results.data === undefined) return null;

  if (results.data.results.length === 0) {
    return <Text style={styles.notice}>{SEARCH_NO_RESULTS}</Text>;
  }

  return (
    <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
      {results.data.results.map((candidate) => (
        <Pressable
          key={`${candidate.name}/${candidate.lat}/${candidate.lng}`}
          accessibilityRole="button"
          accessibilityLabel={resultLabel(candidate.name, candidate.context)}
          onPress={() => onAccept(candidate)}
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
  );
}


function openingView(pin: Pin | null, openNear: Pin | null): { centre: LatLng; zoom: number } {
  if (pin !== null) return { centre: pin, zoom: clampZoom(pin.zoom) };
  if (openNear !== null) return { centre: openNear, zoom: REGION_ZOOM };

  return { centre: WORLD_CENTRE, zoom: 6 };
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
    maxHeight: '94%',
  },
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
  stage: { height: STAGE_HEIGHT, borderRadius: workspaceRadii.card, overflow: 'hidden' },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centrePin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: mapMetrics.pinWidth,
    marginLeft: -mapMetrics.pinWidth / 2,
    marginTop: -mapMetrics.pinHeight,
    alignItems: 'center',
  },
  pinHead: {
    width: mapMetrics.pinWidth,
    height: mapMetrics.pinWidth,
    borderRadius: mapMetrics.pinWidth,
    backgroundColor: mapColors.pinBody,
    borderWidth: 3,
    borderColor: mapColors.pinStroke,
  },
  pinTip: {
    width: 4,
    height: mapMetrics.pinHeight - mapMetrics.pinWidth,
    marginTop: -mapMetrics.pinTipInset,
    backgroundColor: mapColors.pinBody,
  },
  detail: { gap: spacing.xs },
  headline: { ...workspaceTypography.dayTitle, color: workspaceColors.title },
  context: { color: workspaceColors.muted },
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
    flex: 2,
    height: workspaceMetrics.sheetCtaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
  },
  primarySpent: { opacity: 0.4 },
  primaryText: { color: workspaceColors.onAccent },
  remove: { alignItems: 'center', paddingVertical: spacing.xs },
  removeText: { color: workspaceColors.muted },
});
