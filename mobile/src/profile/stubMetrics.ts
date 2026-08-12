export const STUB_METRICS_ON = true;


export function stubFollowerCount(on: boolean = STUB_METRICS_ON): number {
  return on ? integerBetween(1, 100) : 0;
}


export function stubFollowingCount(on: boolean = STUB_METRICS_ON): number {
  return on ? integerBetween(1, 100) : 0;
}


export function stubLikeCount(on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(1, 100) : null;
}


const likesBySubject = new Map<string, number | null>();

const commentsBySubject = new Map<string, number | null>();


export function stubLikeCountFor(subjectId: string, on: boolean = STUB_METRICS_ON): number | null {
  return remembered(likesBySubject, subjectId, on, () => integerBetween(1, 1400));
}


export function stubCommentCountFor(
  subjectId: string,
  on: boolean = STUB_METRICS_ON,
): number | null {
  return remembered(commentsBySubject, subjectId, on, () => integerBetween(0, 60));
}


export function forgetStubCounts(): void {
  likesBySubject.clear();
  commentsBySubject.clear();
}


function remembered(
  memo: Map<string, number | null>,
  subjectId: string,
  on: boolean,
  draw: () => number,
): number | null {
  if (!on) {
    return null;
  }
  const seen = memo.get(subjectId);
  if (seen !== undefined) {
    return seen;
  }
  const drawn = draw();
  memo.set(subjectId, drawn);
  return drawn;
}


export function stubRating(on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(10, 50) / 10 : null;
}


export function stubPricePerPerson(on: boolean = STUB_METRICS_ON): number | null {
  return on ? integerBetween(100, 200) * 100 : null;
}


function integerBetween(lowest: number, highest: number): number {
  return lowest + Math.floor(Math.random() * (highest - lowest + 1));
}
