export function notify(title: string, body: string): void {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
  }
}
