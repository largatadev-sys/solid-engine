import { travelerMotion } from '../theme/workspaceTokens';


export function afterSheetDismissed(raise: () => void): void {
  setTimeout(raise, travelerMotion.sheetOutMs);
}
