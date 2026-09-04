import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../src/components/Icon';
import { confirmWith } from '../../../src/components/confirmDestructive';
import { FeedToast } from '../../../src/feed/FeedToast';
import { useMe } from '../../../src/hooks/useMe';
import { ONBOARDING_ROUTES } from '../../../src/onboarding/onboardingGate';
import { accountRows, confirmsFlip, flipped } from '../../../src/profile/accountRows';
import { ACCOUNT_BACK_LABEL } from '../../../src/profile/profileCopy';
import {
  ACCOUNT_TITLE,
  EDIT_PROFILE_ROW_LABEL,
  FOLLOW_REQUESTS_ROW_LABEL,
  GO_PUBLIC_BODY,
  GO_PUBLIC_CANCEL_LABEL,
  GO_PUBLIC_CONFIRM_LABEL,
  GO_PUBLIC_TITLE,
  PRIVATE_PROFILE_HELPER,
  PRIVATE_PROFILE_ROW_LABEL,
  SIGN_OUT_ROW_LABEL,
  VISIBILITY_FAILED_TOAST,
} from '../../../src/profile/privateProfileCopy';
import { VisibilitySwitch } from '../../../src/profile/VisibilitySwitch';
import { FOLLOW_REQUESTS_ROUTE } from '../../../src/profile/travelerRoutes';
import { forgetPickedTab } from '../../../src/itineraries/tripTabStore';
import { useUpdateProfile } from '../../../src/query/travelerQueries';
import { authRepository } from '../../../src/repositories/authRepository';
import { colors, spacing } from '../../../src/theme';
import {
  followColors,
  followMetrics,
  profileColors,
  followTypography,
  profileTypography,
  publicProfileMotion,
  travelerColors,
  workspaceColors,
} from '../../../src/theme/workspaceTokens';
import type { ProfileVisibility } from '../../../src/types/api';


export default function AccountScreen() {
  const { state } = useMe();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const update = useUpdateProfile();
  const [pending, setPending] = useState<ProfileVisibility | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const served = state.kind === 'ok' ? state.me.profileVisibility : 'public';
  const visibility = pending ?? served;

  function save(next: ProfileVisibility) {
    setPending(next);
    update.mutate(
      { profileVisibility: next },
      {
        onSuccess: () => setPending(null),
        onError: () => {
          setPending(null);
          setToast(VISIBILITY_FAILED_TOAST);
        },
      },
    );
  }

  function onFlip() {
    const next = flipped(visibility);
    if (confirmsFlip(visibility)) {
      confirmWith(
        {
          title: GO_PUBLIC_TITLE,
          body: GO_PUBLIC_BODY,
          confirmLabel: GO_PUBLIC_CONFIRM_LABEL,
          cancelLabel: GO_PUBLIC_CANCEL_LABEL,
          tone: 'accent',
        },
        () => save(next),
      );
      return;
    }
    save(next);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={ACCOUNT_BACK_LABEL}
        >
          <Icon name="back" size={20} color={workspaceColors.title} />
        </Pressable>
        <Text style={styles.title}>{ACCOUNT_TITLE}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.rows}>
        {accountRows(visibility).map((row) => {
          if (row === 'edit-profile') {
            return (
              <Pressable
                key={row}
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel={EDIT_PROFILE_ROW_LABEL}
                onPress={() => router.push(`${ONBOARDING_ROUTES.profile}?mode=edit`)}
              >
                <Text style={styles.rowLabel}>{EDIT_PROFILE_ROW_LABEL}</Text>
                <Icon name="chevronRight" size={16} color={profileColors.rowChevron} />
              </Pressable>
            );
          }

          if (row === 'private-profile') {
            return (
              <View key={row} style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.rowLabel}>{PRIVATE_PROFILE_ROW_LABEL}</Text>
                  <Text style={styles.helper}>{PRIVATE_PROFILE_HELPER}</Text>
                </View>
                <VisibilitySwitch
                  on={visibility === 'private'}
                  onFlip={onFlip}
                  label={PRIVATE_PROFILE_ROW_LABEL}
                />
              </View>
            );
          }

          if (row === 'follow-requests') {
            return (
              <Pressable
                key={row}
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel={FOLLOW_REQUESTS_ROW_LABEL}
                onPress={() => router.push(FOLLOW_REQUESTS_ROUTE)}
              >
                <Text style={styles.rowLabel}>{FOLLOW_REQUESTS_ROW_LABEL}</Text>
                <Icon name="chevronRight" size={16} color={profileColors.rowChevron} />
              </Pressable>
            );
          }

          return (
            <Pressable
              key={row}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={SIGN_OUT_ROW_LABEL}
              onPress={() => {
                forgetPickedTab();
                void authRepository.signOut();
              }}
            >
              <Text style={[styles.rowLabel, styles.destructive]}>{SIGN_OUT_ROW_LABEL}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FeedToast
        message={toast}
        holdMs={publicProfileMotion.toastHoldMs}
        onDone={() => setToast(null)}
      />
    </View>
  );
}


const ACCOUNT_HELPER_WIDTH = 300;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md2,
    paddingVertical: spacing.sm2,
  },
  back: {
    width: followMetrics.kebabTarget,
    height: followMetrics.kebabTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...followTypography.listTitle, color: workspaceColors.title },
  rows: { paddingHorizontal: spacing.md2 },
  row: {
    minHeight: followMetrics.accountRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: followColors.followingBorder,
  },
  switchRow: {
    minHeight: followMetrics.accountRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm2,
    borderBottomWidth: 1,
    borderBottomColor: followColors.followingBorder,
  },
  switchText: { flex: 1, gap: spacing.hair },
  rowLabel: { ...profileTypography.accountRow, color: workspaceColors.title },
  helper: {
    ...profileTypography.accountHelper,
    color: profileColors.meta,
    maxWidth: ACCOUNT_HELPER_WIDTH,
  },
  destructive: { color: travelerColors.destructive },
});
