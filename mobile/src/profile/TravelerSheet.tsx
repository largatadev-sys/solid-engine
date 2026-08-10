import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../components/comingSoon';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { MemberResponse } from '../types/api';
import { profileCardOfMember } from './profileCard';
import { ProfileCardView } from './ProfileCardView';

export const VISIT_PROFILE_LABEL = 'Visit Profile';

export const TRAVELER_SHEET_DISMISS_LABEL = 'Close';


interface TravelerSheetProps {
  readonly traveler: MemberResponse | null;
  readonly onDismiss: () => void;
}


export function TravelerSheet({ traveler, onDismiss }: TravelerSheetProps) {
  return (
    <Modal
      visible={traveler !== null}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityLabel="Close profile">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.grabber} />

          {traveler !== null && (
            <ProfileCardView
              card={profileCardOfMember(traveler)}
              photoLabel={`${traveler.displayName}'s profile photo`}
            />
          )}

          <Pressable
            style={styles.visit}
            onPress={() => comingSoon('profile')}
            accessibilityRole="button"
            accessibilityLabel={`${VISIT_PROFILE_LABEL}, coming soon`}
          >
            <Text style={styles.visitLabel}>{VISIT_PROFILE_LABEL}</Text>
          </Pressable>

          <Pressable
            style={styles.dismiss}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={TRAVELER_SHEET_DISMISS_LABEL}
          >
            <Text style={styles.dismissLabel}>{TRAVELER_SHEET_DISMISS_LABEL}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const GREYED_OPACITY = 0.45;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: workspaceColors.scrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: workspaceRadii.sheet,
    borderTopRightRadius: workspaceRadii.sheet,
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  grabber: {
    width: workspaceMetrics.grabberWidth,
    height: workspaceMetrics.grabberHeight,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.hairline,
  },
  visit: {
    alignSelf: 'stretch',
    height: workspaceMetrics.sheetCtaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: GREYED_OPACITY,
  },
  visitLabel: {
    ...workspaceTypography.ctaPrimary,
    color: workspaceColors.onAccent,
  },
  dismiss: {
    alignSelf: 'stretch',
    height: workspaceMetrics.sheetCtaHeight,
    borderRadius: workspaceRadii.control,
    borderWidth: 1.5,
    borderColor: workspaceColors.railBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    ...workspaceTypography.sheetDismiss,
    color: workspaceColors.sheetBody,
  },
});
