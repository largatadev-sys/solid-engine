import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { memoryColors, memoryMetrics } from '../theme/memoryTokens';


export type MemoryIconName =
  | 'book'
  | 'bookPlain'
  | 'bookPlus'
  | 'postcard'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronRightSmall'
  | 'chevronUp'
  | 'chevronDown'
  | 'image'
  | 'pin'
  | 'check'
  | 'checkCircle'
  | 'plus'
  | 'plusCircle'
  | 'menu'
  | 'kebab'
  | 'pencil'
  | 'trash'
  | 'home'
  | 'search'
  | 'trips'
  | 'person'
  | 'calendar';


interface MemoryIconProps {
  readonly name: MemoryIconName;
  readonly size?: number;
  readonly color?: string;
  readonly strokeWidth?: number;
}


const VIEWBOX: Partial<Record<MemoryIconName, string>> = {
  chevronLeft: '0 0 20 20',
  chevronRightSmall: '0 0 20 20',
  check: '0 0 16 16',
  chevronUp: '0 0 16 16',
  chevronDown: '0 0 16 16',
};


export function MemoryIcon({
  name,
  size = 22,
  color = memoryColors.title,
  strokeWidth = memoryMetrics.iconStroke,
}: MemoryIconProps) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox={VIEWBOX[name] ?? '0 0 24 24'}>
      {name === 'book' && (
        <>
          <Path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z" {...stroke} />
          <Path d="M5 17a2 2 0 0 1 2-2h12" {...stroke} />
          <Path d="M9 8h6" {...stroke} />
        </>
      )}
      {name === 'bookPlain' && (
        <>
          <Path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z" {...stroke} />
          <Path d="M5 17a2 2 0 0 1 2-2h12" {...stroke} />
        </>
      )}
      {name === 'bookPlus' && (
        <>
          <Path d="M5 4h11a3 3 0 0 1 3 3v13H7a2 2 0 0 1-2-2z" {...stroke} />
          <Path d="M5 17a2 2 0 0 1 2-2h12" {...stroke} />
          <Path d="M12 8v6M9 11h6" {...stroke} />
        </>
      )}
      {name === 'postcard' && (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2" {...stroke} />
          <Path d="M14 9h4M14 12h4" {...stroke} />
          <Circle cx="8" cy="11" r="2" {...stroke} />
        </>
      )}
      {name === 'chevronLeft' && <Path d="M12.5 4.5L7 10l5.5 5.5" {...stroke} />}
      {name === 'chevronRight' && <Path d="M9 18l6-6-6-6" {...stroke} />}
      {name === 'chevronRightSmall' && <Path d="M7.5 4.5L13 10l-5.5 5.5" {...stroke} />}
      {name === 'chevronUp' && <Path d="M4 10l4-4 4 4" {...stroke} />}
      {name === 'chevronDown' && <Path d="M4 6l4 4 4-4" {...stroke} />}
      {name === 'image' && (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2" {...stroke} />
          <Circle cx="9" cy="10" r="1.8" {...stroke} />
          <Path d="M21 16l-5-5-8 8" {...stroke} />
        </>
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" {...stroke} />
          <Circle cx="12" cy="9" r="2.5" {...stroke} />
        </>
      )}
      {name === 'check' && <Path d="M3 8.5l3.5 3.5 6.5-7" {...stroke} />}
      {name === 'checkCircle' && (
        <>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M8 12.5l2.5 2.5 5.5-6" {...stroke} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} />}
      {name === 'plusCircle' && (
        <>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M12 8v8M8 12h8" {...stroke} />
        </>
      )}
      {name === 'menu' && <Path d="M4 6h16M4 12h16M4 18h16" {...stroke} />}
      {name === 'kebab' && (
        <>
          <Circle cx="5" cy="12" r="2" fill={color} />
          <Circle cx="12" cy="12" r="2" fill={color} />
          <Circle cx="19" cy="12" r="2" fill={color} />
        </>
      )}
      {name === 'pencil' && (
        <>
          <Path d="M4 20h4l10-10-4-4L4 16z" {...stroke} />
          <Path d="M13 7l4 4" {...stroke} />
        </>
      )}
      {name === 'trash' && <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...stroke} />}
      {name === 'home' && (
        <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...stroke} />
      )}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="7" {...stroke} />
          <Path d="M20 20l-4-4" {...stroke} />
        </>
      )}
      {name === 'trips' && (
        <>
          <Rect x="3" y="7" width="18" height="13" rx="2" {...stroke} />
          <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...stroke} />
        </>
      )}
      {name === 'person' && (
        <>
          <Circle cx="12" cy="8" r="4" {...stroke} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...stroke} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2" {...stroke} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...stroke} />
        </>
      )}
    </Svg>
  );
}
