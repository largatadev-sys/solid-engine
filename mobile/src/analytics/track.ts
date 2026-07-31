export type AnalyticsProps = Record<string, string | number | boolean>;


export function track(event: string, props: AnalyticsProps = {}): void {
  const line = { event, ...props };
  // eslint-disable-next-line no-console
  console.log(`analytics ${JSON.stringify(line)}`);
}
