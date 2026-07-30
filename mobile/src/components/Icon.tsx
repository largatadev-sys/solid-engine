import Svg, { Circle, Line, Path, Polygon, Polyline } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'mailCheck'
  | 'person'
  | 'compass'
  | 'map'
  | 'users'
  | 'share'
  | 'dollar'
  | 'chevronDown'
  | 'check'
  | 'sparkle';

interface IconProps {
  readonly name: IconName;
  readonly size: number;
  readonly color: string;
}

const STROKE = 2;

export function Icon({ name, size, color }: IconProps) {
  const shared = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Polyline points="15 18 9 12 15 6" {...shared} />}

      {name === 'mailCheck' && (
        <>
          <Path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" {...shared} />
          <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...shared} />
          <Path d="m16 19 2 2 4-4" {...shared} />
        </>
      )}

      {name === 'person' && (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...shared} />
          <Circle cx="12" cy="7" r="4" {...shared} />
        </>
      )}

      {name === 'compass' && (
        <>
          <Circle cx="12" cy="12" r="10" {...shared} />
          <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" {...shared} />
        </>
      )}

      {name === 'map' && (
        <>
          <Polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2" {...shared} />
          <Line x1="8" y1="2" x2="8" y2="18" {...shared} />
          <Line x1="16" y1="6" x2="16" y2="22" {...shared} />
        </>
      )}

      {name === 'users' && (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...shared} />
          <Circle cx="9" cy="7" r="4" {...shared} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...shared} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...shared} />
        </>
      )}

      {name === 'share' && (
        <>
          <Circle cx="18" cy="5" r="3" {...shared} />
          <Circle cx="6" cy="12" r="3" {...shared} />
          <Circle cx="18" cy="19" r="3" {...shared} />
          <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" {...shared} />
          <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" {...shared} />
        </>
      )}

      {name === 'dollar' && (
        <>
          <Line x1="12" y1="1" x2="12" y2="23" {...shared} />
          <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...shared} />
        </>
      )}

      {name === 'chevronDown' && <Polyline points="6 9 12 15 18 9" {...shared} />}

      {name === 'check' && (
        <>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...shared} />
          <Polyline points="22 4 12 14.01 9 11.01" {...shared} />
        </>
      )}

      {name === 'sparkle' && (
        <>
          <Path d="M5.8 11.3 2 22l10.7-3.8" {...shared} />
          <Path d="M4 3h.01" {...shared} />
          <Path d="M22 8h.01" {...shared} />
          <Path d="M15 2h.01" {...shared} />
          <Path d="M22 20h.01" {...shared} />
          <Path
            d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"
            {...shared}
          />
          <Path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" {...shared} />
          <Path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" {...shared} />
          <Path
            d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"
            {...shared}
          />
        </>
      )}
    </Svg>
  );
}
