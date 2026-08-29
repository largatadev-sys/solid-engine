const LATE = Symbol('late');

export async function settledWithin<T>(
  start: () => Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answer = await Promise.race<T | typeof LATE>([
      start(),
      new Promise<typeof LATE>((resolve) => {
        timer = setTimeout(() => resolve(LATE), ms);
      }),
    ]);
    return answer === LATE ? fallback : answer;
  } catch {
    return fallback;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
