const LOCKED_TO_THE_APP_FRAME =
  'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, '
  + 'user-scalable=no, shrink-to-fit=no';


export function lockViewportToTheAppFrame(): void {
  if (typeof document === 'undefined') return;

  let tag = document.querySelector('meta[name="viewport"]');
  if (tag === null) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'viewport');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', LOCKED_TO_THE_APP_FRAME);
}
