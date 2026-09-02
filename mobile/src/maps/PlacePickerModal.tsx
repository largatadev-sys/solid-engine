import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  PICKER_CONFIRM,
  PICKER_DISMISS,
  PICKER_REMOVE,
  PLACE_LABEL,
  PIN_AT_CENTRE,
  RESOLVING_CONTEXT,
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
  whereLine,
  type PickedDetail,
} from './pickedPlace';
import type { Pin } from './pinRules';
import { TileSurface } from './TileSurface';
import { useDrawerSlide } from './useDrawerSlide';
import { clampZoom, type LatLng } from './tileProjection';


const SHEET_MAX_WIDTH = 420;

const SHEET_HEIGHT = 620;

const PICKED_ZOOM = 16;

const REGION_ZOOM = 12;

const SETTLE_MS = 450;

const DETAIL_HEIGHT = 92;

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
  const { mounted, translateY, scrim } = useDrawerSlide(visible, SHEET_HEIGHT);

  const [view, setView] = useState(() => openingView(pin, openNear));
  const [detail, setDetail] = useState<PickedDetail | null>(null);
  const [named, setNamed] = useState('');
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');

  const exactAt = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!visible) return;

    setView(openingView(pin, openNear));
    const seeded = place.trim();
    setDetail(seeded === '' ? null : { name: seeded, nearby: false, kind: null, context: null, exact: true });
    setNamed(seeded);
    exactAt.current = pin;
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
        const resolved = detailFrom(found ?? null, false);
        setDetail(resolved);
        setNamed(headlineFor(resolved));
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
    const picked = detailFrom(candidate, true);
    setDetail(picked);
    setNamed(headlineFor(picked));
    setView({ centre: landed, zoom: PICKED_ZOOM });
    setResolving(false);
    setQuery('');
  };

  const confirmable = !resolving && nameToSave(named) !== '';

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.stack}>
        <Animated.View style={[styles.scrim, { opacity: scrim }]}>
          <Pressable
            style={styles.scrimTarget}
            accessibilityRole="button"
            accessibilityLabel={PICKER_DISMISS}
            onPress={onDismiss}
          />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.grabber} />

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={workspaceColors.placeholder}
            accessibilityLabel={SEARCH_PLACEHOLDER}
            autoCorrect={false}
          />

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

            <Results query={query} bias={view.centre} onAccept={accept} />
          </View>

          <View style={styles.detail}>
            <TextInput
              style={styles.headline}
              value={resolving ? '' : named}
              onChangeText={setNamed}
              placeholder={resolving ? RESOLVING_PLACE : PLACE_LABEL}
              placeholderTextColor={workspaceColors.accent}
              accessibilityLabel={PLACE_LABEL}
              editable={!resolving}
              numberOfLines={1}
            />
            <Text style={styles.context} numberOfLines={1}>
              {resolving ? RESOLVING_CONTEXT : whereLine(detail)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PICKER_CONFIRM}
            accessibilityState={{ disabled: !confirmable }}
            disabled={!confirmable}
            onPress={() =>
              onConfirm({
                place: nameToSave(named),
                pin: { lat: view.centre.lat, lng: view.centre.lng, zoom: clampZoom(view.zoom) },
              })
            }
            style={StyleSheet.flatten([styles.primary, !confirmable && styles.primarySpent])}
          >
            <Text style={styles.primaryText}>{PICKER_CONFIRM}</Text>
          </Pressable>

          <View style={styles.footer}>
            {pin === null ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={PICKER_REMOVE}
                onPress={() => onConfirm({ place: '', pin: null })}
              >
                <Text style={styles.removeText}>{PICKER_REMOVE}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
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

  const body = () => {
    if (results.isError) return <Text style={styles.overlayNotice}>{SEARCH_UNAVAILABLE}</Text>;
    if (results.data === undefined) return <ActivityIndicator color={workspaceColors.accent} />;
    if (results.data.results.length === 0) {
      return <Text style={styles.overlayNotice}>{SEARCH_NO_RESULTS}</Text>;
    }

    return (
      <ScrollView keyboardShouldPersistTaps="handled">
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
  };

  return <View style={styles.overlay}>{body()}</View>;
}


function openingView(pin: Pin | null, openNear: Pin | null): { centre: LatLng; zoom: number } {
  if (pin !== null) return { centre: pin, zoom: clampZoom(pin.zoom) };
  if (openNear !== null) return { centre: openNear, zoom: REGION_ZOOM };

  return { centre: WORLD_CENTRE, zoom: 6 };
}


const styles = StyleSheet.create({
  stack: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: workspaceColors.sheetScrim,
  },
  scrimTarget: { flex: 1 },
  sheet: {
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
    height: SHEET_HEIGHT,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: workspaceRadii.sheet,
    borderTopRightRadius: workspaceRadii.sheet,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: workspaceMetrics.grabberWidth,
    height: workspaceMetrics.grabberHeight,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.drawerHandle,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  search: {
    height: mapMetrics.searchBoxHeight,
    borderWidth: 1,
    borderColor: workspaceColors.inputBorder,
    borderRadius: workspaceRadii.control,
    paddingHorizontal: spacing.sm,
    color: workspaceColors.title,
  },
  stage: { flex: 1, borderRadius: workspaceRadii.card, overflow: 'hidden' },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    maxHeight: mapMetrics.resultRowHeight * 4,
    backgroundColor: workspaceColors.surface,
    borderRadius: workspaceRadii.card,
    paddingHorizontal: spacing.sm,
  },
  overlayNotice: { color: workspaceColors.muted, paddingVertical: spacing.sm },
  result: {
    minHeight: mapMetrics.resultRowHeight,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: mapColors.resultDivider,
  },
  resultName: { color: workspaceColors.title },
  resultContext: { color: workspaceColors.muted },
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
  detail: { height: DETAIL_HEIGHT, justifyContent: 'center', gap: spacing.xs },
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
  primary: {
    height: workspaceMetrics.sheetCtaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
  },
  primarySpent: { opacity: 0.4 },
  primaryText: { color: workspaceColors.onAccent },
  footer: { height: mapMetrics.attributionHeight, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: workspaceColors.muted },
});
