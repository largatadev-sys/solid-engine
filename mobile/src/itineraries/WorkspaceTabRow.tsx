import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../components/comingSoon';
import { dragToScroll } from '../components/stripScroll';
import { freeScroll } from '../components/stripSettle';
import type { ComingSoonSurface } from '../components/comingSoonMessage';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';


export type WorkspaceTab = 'day-by-day' | 'polls' | 'travelers' | 'photo-dump' | 'chat' | 'details';

type TabDefinition = {
  readonly key: WorkspaceTab;
  readonly label: string;
  readonly comingSoonSurface?: ComingSoonSurface;
};


export const WORKSPACE_TABS: readonly TabDefinition[] = [
  { key: 'day-by-day', label: 'Day-by-Day' },
  { key: 'polls', label: 'Polls', comingSoonSurface: 'polls' },
  { key: 'travelers', label: 'Travelers' },
  { key: 'photo-dump', label: 'Photo Dump' },
  { key: 'chat', label: 'Chat', comingSoonSurface: 'chat' },
  { key: 'details', label: 'Details' },
];


export function workspaceTabFrom(requested: string | undefined): WorkspaceTab {
  const match = WORKSPACE_TABS.find(
    (tab) => tab.key === requested && tab.comingSoonSurface === undefined,
  );
  return match?.key ?? 'day-by-day';
}


interface WorkspaceTabRowProps {
  readonly active: WorkspaceTab;
  readonly onSelect: (tab: WorkspaceTab) => void;
}


export function WorkspaceTabRow({ active, onSelect }: WorkspaceTabRowProps) {
  const [drag] = useState(() => dragToScroll(freeScroll));

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroller}
        {...drag}
      >
        {WORKSPACE_TABS.map((tab) => {
          const greyed = tab.comingSoonSurface !== undefined;
          const isActive = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() =>
                greyed ? comingSoon(tab.comingSoonSurface as ComingSoonSurface) : onSelect(tab.key)
              }
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive, disabled: greyed }}
              accessibilityLabel={greyed ? `${tab.label}, coming soon` : tab.label}
            >
              <Text style={[styles.label, isActive && styles.labelActive, greyed && styles.labelGreyed]}>
                {tab.label}
              </Text>
              {isActive ? <View style={styles.underline} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  row: {
    height: workspaceMetrics.tabRowHeight,
    borderBottomWidth: 1,
    borderBottomColor: workspaceColors.hairline,
  },
  scroller: {
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
  },
  tab: {
    height: workspaceMetrics.tabRowHeight,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  label: {
    ...workspaceTypography.tabLabel,
    color: workspaceColors.muted,
    paddingBottom: 8,
  },
  labelActive: {
    ...workspaceTypography.tabLabelActive,
    color: workspaceColors.accent,
    paddingBottom: 8,
  },
  labelGreyed: {
    opacity: 0.45,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: workspaceMetrics.tabUnderlineHeight,
    width: '100%',
    backgroundColor: workspaceColors.accent,
    borderTopLeftRadius: workspaceRadii.pill,
    borderTopRightRadius: workspaceRadii.pill,
  },
});
