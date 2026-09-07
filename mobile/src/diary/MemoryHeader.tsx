import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBack, type BackTarget } from '../navigation/safeBack';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { BACK_LABEL } from './memoryCopy';
import { MemoryIcon } from './MemoryIcon';


export type MemoryPill = 'DIARY' | 'POSTCARD';


interface MemoryHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly pill?: MemoryPill;
  readonly backTo?: BackTarget;
  readonly onBack?: () => void;
}


export function MemoryHeader({ title, subtitle, pill, backTo, onBack }: MemoryHeaderProps) {
  const goBack = useSafeBack(backTo);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.block, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) =>
            StyleSheet.flatten([styles.back, pressed ? styles.backPressed : null])
          }
          accessibilityRole="button"
          accessibilityLabel={BACK_LABEL}
          onPress={onBack ?? goBack}
        >
          <MemoryIcon
            name="chevronLeft"
            size={memoryMetrics.headerChevron}
            color={memoryColors.title}
          />
        </Pressable>
        {pill !== undefined && <Text style={styles.pill}>{pill}</Text>}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}


const styles = StyleSheet.create({
  block: {
    paddingHorizontal: memoryMetrics.screenPadding,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    width: memoryMetrics.headerButton,
    height: memoryMetrics.headerButton,
    borderRadius: memoryMetrics.headerButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: memoryMetrics.headerButtonPull,
  },
  backPressed: {
    backgroundColor: memoryColors.hover,
    opacity: memoryMotion.pressOpacity,
  },
  pill: {
    ...memoryTypography.pill,
    color: memoryColors.diaryPillInk,
    backgroundColor: memoryColors.diaryPillWell,
    paddingVertical: memoryMetrics.pillPaddingV,
    paddingHorizontal: memoryMetrics.pillPaddingH,
    borderRadius: memoryMetrics.pillRadius,
    overflow: 'hidden',
  },
  title: {
    ...memoryTypography.screenTitle,
    color: memoryColors.title,
    marginTop: 6,
  },
  subtitle: {
    ...memoryTypography.subtitle,
    color: memoryColors.muted,
  },
});
