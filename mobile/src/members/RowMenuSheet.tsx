import { Fragment } from 'react';
import { stillShowing } from '../components/stillShowing';
import { BottomSheet } from './BottomSheet';
import { rowMenuEntries, type RowMenuEntryKey, type RowMenuInput } from './rowMenu';
import { MenuDivider, MenuEntryRow } from './TravelerRows';


export interface RowMenuSubject extends RowMenuInput {
  readonly travelerId: string;
  readonly title: string;
  readonly displayName: string;
}


interface RowMenuSheetProps {
  readonly subject: RowMenuSubject | null;
  readonly lastSubject: RowMenuSubject | null;
  readonly onSelect: (entry: RowMenuEntryKey, subject: RowMenuSubject) => void;
  readonly onDismiss: () => void;
}


export function RowMenuSheet({ subject, lastSubject, onSelect, onDismiss }: RowMenuSheetProps) {
  const shown = stillShowing(subject, lastSubject);
  if (shown === null) {
    return null;
  }

  const entries = rowMenuEntries(shown);


  return (
    <BottomSheet open={subject !== null} title={shown.title} onDismiss={onDismiss}>
      {entries.map((entry, at) => (
        <Fragment key={entry.key}>
          {at > 0 ? <MenuDivider /> : null}
          <MenuEntryRow
            label={entry.label}
            destructive={entry.destructive}
            icon={entry.icon}
            onPress={() => onSelect(entry.key, shown)}
          />
        </Fragment>
      ))}
    </BottomSheet>
  );
}
