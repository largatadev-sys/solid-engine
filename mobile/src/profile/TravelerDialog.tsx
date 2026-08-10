import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../components/comingSoon';
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

export const TRAVELER_DIALOG_DISMISS_LABEL = 'Close';

const DIALOG_MAX_WIDTH = 380;

const GREYED_OPACITY = 0.45;


interface TravelerDialogProps {
  readonly traveler: MemberResponse | null;
  readonly onDismiss: () => void;
}


export function TravelerDialog({ traveler, onDismiss }: TravelerDialogProps) {
  return (
    <Modal visible={traveler !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Close profile">
        <Pressable style={styles.dialog} onPress={() => undefined}>
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
            accessibilityLabel={TRAVELER_DIALOG_DISMISS_LABEL}
          >
            <Text style={styles.dismissLabel}>{TRAVELER_DIALOG_DISMISS_LABEL}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: workspaceColors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: DIALOG_MAX_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderRadius: workspaceRadii.card,
    padding: 24,
    gap: 16,
    alignItems: 'center',
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
