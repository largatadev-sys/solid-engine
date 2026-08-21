import { chatMotion } from '../theme/workspaceTokens';

const COPIED_STYLES = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'boxSizing',
  'textTransform',
] as const;

const KEEPS_A_TRAILING_BLANK_LINE_MEASURABLE = '​';

let mirror: HTMLDivElement | null = null;


export function animateComposerGrowth(): void {}


export function naturalContentHeight(field: unknown, reported: number): number {
  const node = field as HTMLTextAreaElement | null;
  if (node == null || typeof node.value !== 'string' || node.ownerDocument == null) {
    return reported;
  }

  const doc = node.ownerDocument;
  if (mirror == null || mirror.ownerDocument !== doc) {
    mirror = doc.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(mirror);
  }

  const from = doc.defaultView?.getComputedStyle(node);
  if (from == null) return reported;

  for (const property of COPIED_STYLES) {
    mirror.style[property] = from[property];
  }
  mirror.style.position = 'absolute';
  mirror.style.top = '-9999px';
  mirror.style.left = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.height = 'auto';
  mirror.style.overflow = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.border = '0';
  mirror.style.width = `${node.clientWidth}px`;
  mirror.textContent =
    node.value === '' ? ' ' : node.value + KEEPS_A_TRAILING_BLANK_LINE_MEASURABLE;

  return mirror.offsetHeight;
}


export const composerFieldTransition = {
  transitionProperty: 'height',
  transitionDuration: `${chatMotion.layoutMs}ms`,
  transitionTimingFunction: 'ease-in-out',
  scrollbarWidth: 'none',
} as const;


export const MEASURES_FROM_A_MIRROR = true;
