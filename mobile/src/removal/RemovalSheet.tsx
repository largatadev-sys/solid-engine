import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { stillShowing } from '../components/stillShowing';
import { BottomSheet } from '../members/BottomSheet';
import { removalColors } from '../theme/removalTokens';
import {
  travelerColors,
  travelerMetrics,
  travelerTypography,
} from '../theme/workspaceTokens';
import {
  removalMenuEntries,
  type RemovalMenuKey,
  type RemovalMenuTone,
  type RemovalSubjectKind,
} from './removalMenu';


export interface RemovalSubject {
  readonly id: string;
  readonly kind: RemovalSubjectKind;
  readonly title: string;
  readonly itineraryId?: string;
}


interface RemovalSheetProps {
  readonly subject: RemovalSubject | null;
  readonly lastSubject: RemovalSubject | null;
  readonly onSelect: (entry: RemovalMenuKey, subject: RemovalSubject) => void;
  readonly onDismiss: () => void;
}


export function RemovalSheet({ subject, lastSubject, onSelect, onDismiss }: RemovalSheetProps) {
  const shown = stillShowing(subject, lastSubject);
  if (shown === null) {
    return null;
  }

  const entries = removalMenuEntries(shown.kind);

  return (
    <BottomSheet open={subject !== null} title={shown.title} onDismiss={onDismiss}>
      {entries.map((entry, at) => (
        <Fragment key={entry.key}>
          {at > 0 ? <MenuDivider /> : null}
          <TonedMenuEntry
            label={entry.label}
            tone={entry.tone}
            icon={entry.icon}
            onPress={() => onSelect(entry.key, shown)}
          />
        </Fragment>
      ))}
    </BottomSheet>
  );
}


const TONE_INK: Record<RemovalMenuTone, string> = {
  default: travelerColors.ink,
  destructive: travelerColors.destructive,
  cautionary: removalColors.cautionary,
};


function TonedMenuEntry({
  label,
  tone,
  icon,
  onPress,
}: {
  readonly label: string;
  readonly tone: RemovalMenuTone;
  readonly icon: IconName;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();
  const ink = TONE_INK[tone];

  return (
    <AnimatedPressable
      style={[styles.entry, press.style]}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={travelerMetrics.menuIcon} color={ink} />
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </AnimatedPressable>
  );
}


function MenuDivider() {
  return <View style={styles.divider} />;
}


const styles = StyleSheet.create({
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: travelerMetrics.rowGap,
    paddingVertical: travelerMetrics.menuEntryPaddingV,
    paddingHorizontal: travelerMetrics.menuEntryPaddingH,
    minHeight: travelerMetrics.avatarHit,
  },
  label: {
    ...travelerTypography.menuEntry,
  },
  divider: {
    height: 1,
    backgroundColor: travelerColors.divider,
    marginHorizontal: travelerMetrics.menuEntryPaddingH,
  },
});
