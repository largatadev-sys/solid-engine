import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import {
  followColors,
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { AWAITING_COUNT } from './publicProfileCopy';


export interface StatCell {
  readonly label: string;
  readonly value: number | null;
  readonly open: (() => void) | null;
}


export function StatCells({ cells }: { readonly cells: readonly StatCell[] }) {
  return (
    <View style={styles.row}>
      {cells.map((cell, index) => {
        const shown = cell.value ?? AWAITING_COUNT;
        const body = (
          <>
            <Text style={styles.value}>{shown}</Text>
            <Text style={styles.label}>{cell.label}</Text>
          </>
        );

        if (cell.open === null) {
          return (
            <View key={cell.label} style={[styles.cell, index > 0 && styles.divided]}>
              {body}
            </View>
          );
        }

        return (
          <Pressable
            key={cell.label}
            style={({ pressed }) =>
              StyleSheet.flatten([
                styles.cell,
                index > 0 && styles.divided,
                pressed && styles.pressed,
              ])
            }
            onPress={cell.open}
            accessibilityRole="button"
            accessibilityLabel={`${shown} ${cell.label}`}
          >
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
    paddingVertical: spacing.sm2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.hair,
  },
  divided: {
    borderLeftWidth: 1,
    borderLeftColor: profileColors.cellDivider,
  },
  pressed: {
    backgroundColor: followColors.rowPress,
  },
  value: {
    ...profileTypography.statValue,
    color: workspaceColors.title,
  },
  label: {
    ...profileTypography.statLabel,
    color: profileColors.meta,
  },
});
