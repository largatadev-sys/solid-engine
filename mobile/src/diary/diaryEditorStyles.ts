import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
} from '../theme/workspaceTokens';


export const diaryEditorStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loading: {
    marginTop: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: {
    ...diaryTypography.eyebrow,
    color: diaryColors.eyebrow,
  },
  title: {
    ...diaryTypography.activityTitle,
    color: workspaceColors.title,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...diaryTypography.sectionLabel,
    color: diaryColors.sectionLabel,
  },
  photoBlock: {
    gap: spacing.sm3,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  count: {
    ...diaryTypography.count,
    color: diaryColors.count,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: diaryMetrics.tileGap,
  },
  addRow: {
    flexDirection: 'row',
    gap: diaryMetrics.tileGap,
  },
  emptyPhotos: {
    ...diaryTypography.note,
    color: workspaceColors.muted,
  },
  caption: {
    marginTop: spacing.sm2,
    backgroundColor: diaryColors.tileWell,
    borderWidth: 1,
    borderColor: diaryColors.fieldBorder,
    borderRadius: radii.md,
    minHeight: diaryMetrics.captionMinHeight,
    padding: diaryMetrics.captionPadding,
    textAlignVertical: 'top',
    ...diaryTypography.caption,
    color: workspaceColors.title,
  },
  failure: {
    ...typography.caption,
    color: colors.danger,
  },
  cta: {
    height: diaryMetrics.ctaHeight,
    borderRadius: diaryMetrics.ctaRadius,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaLabel: {
    ...diaryTypography.cta,
    color: workspaceColors.onAccent,
  },
});
