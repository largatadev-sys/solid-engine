export type DiaryPaneState = 'loading' | 'failed' | 'empty' | 'rows';

interface QueryPosture {
  readonly isPending: boolean;
  readonly isError: boolean;
}

export function diaryPaneState(query: QueryPosture, rowCount: number): DiaryPaneState {
  if (query.isPending) {
    return 'loading';
  }
  if (query.isError) {
    return 'failed';
  }
  return rowCount === 0 ? 'empty' : 'rows';
}
