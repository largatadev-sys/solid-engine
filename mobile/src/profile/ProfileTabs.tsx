import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DIARY_TAB_LABEL, ITINERARIES_TAB_LABEL } from './profileCopy';
import type { ProfileTab } from './profileViewState';


interface ProfileTabsProps {
  readonly selected: ProfileTab;
  readonly onSelect: (tab: ProfileTab) => void;
}

const TABS: readonly { readonly tab: ProfileTab; readonly label: string }[] = [
  { tab: 'diary', label: DIARY_TAB_LABEL },
  { tab: 'itineraries', label: ITINERARIES_TAB_LABEL },
];


export function ProfileTabs({ selected, onSelect }: ProfileTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map(({ tab, label }) => {
        const active = tab === selected;
        return (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => onSelect(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Text style={active ? styles.labelActive : styles.label}>{label}</Text>
            <View style={active ? styles.barActive : styles.bar} />
          </Pressable>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.hairline,
    marginTop: spacing.xs2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm2,
  },
  label: {
    ...memoryTypography.tabIdle,
    color: memoryColors.muted,
  },
  labelActive: {
    ...memoryTypography.tabActive,
    color: memoryColors.accent,
  },
  bar: {
    width: '100%',
    height: memoryMetrics.tabBar,
  },
  barActive: {
    width: '100%',
    height: memoryMetrics.tabBar,
    backgroundColor: memoryColors.accent,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
});
