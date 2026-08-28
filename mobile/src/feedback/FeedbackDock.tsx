import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { baseUrl } from '../api/apiClient';
import { colors, radii } from '../theme';
import { feedbackMetrics, feedbackMotion } from '../theme/workspaceTokens';
import { DOCK_LABEL } from './feedbackCopy';
import { useFeedbackState } from './feedbackDockState';
import { dockVisible } from './feedbackVisibility';
import { FeedbackSheet } from './FeedbackSheet';
import type { ReportDraft } from './reportDraft';
import { useReportDraft } from './useReportDraft';


export function FeedbackDock() {
  const { visibility } = useFeedbackState();
  const insets = useSafeAreaInsets();
  const press = usePressFeedback();
  const mintDraft = useReportDraft();
  const [draft, setDraft] = useState<ReportDraft | null>(null);

  if (!dockVisible(visibility, baseUrl())) {
    return null;
  }

  const bottom =
    Math.max(insets.bottom, feedbackMotion.clampInsetPx) + feedbackMotion.defaultBottomReservePx;

  return (
    <>
      <View
        style={[styles.layer, { bottom, right: feedbackMotion.railInsetPx }]}
        pointerEvents={draft === null ? 'box-none' : 'none'}
      >
        <AnimatedPressable
          style={[styles.disc, press.style, draft !== null && styles.hidden]}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          onPress={() => setDraft(mintDraft())}
          hitSlop={2}
          accessibilityRole="button"
          accessibilityLabel={DOCK_LABEL}
          accessibilityElementsHidden={draft !== null}
          importantForAccessibility={draft === null ? 'yes' : 'no-hide-descendants'}
        >
          <Icon name="feedback" size={feedbackMetrics.glyph} color={colors.accent} />
        </AnimatedPressable>
      </View>

      <FeedbackSheet draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}


const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    zIndex: 2,
  },
  disc: {
    width: feedbackMetrics.disc,
    height: feedbackMetrics.disc,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  hidden: {
    opacity: 0,
  },
});
