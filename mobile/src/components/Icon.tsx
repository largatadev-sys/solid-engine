import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { workspaceColors } from '../theme/workspaceTokens';

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
  | 'chevronRight'
  | 'check'
  | 'search'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'home'
  | 'mapPin'
  | 'settings'
  | 'filePlus'
  | 'gitBranch'
  | 'fork'
  | 'shieldCheck'
  | 'workspace'
  | 'travelGroup'
  | 'globe'
  | 'pencil'
  | 'eye'
  | 'checkCircle'
  | 'link'
  | 'star'
  | 'starFilled'
  | 'heartFilled'
  | 'heart'
  | 'heartSolid'
  | 'comment'
  | 'bookmark'
  | 'bell'
  | 'close'
  | 'sliders'
  | 'partyPopper'
  | 'camera'
  | 'briefcase'
  | 'plusCircle'
  | 'filter'
  | 'pencilSquare'
  | 'userPlus'
  | 'calendarPlus'
  | 'grip'
  | 'clock'
  | 'info'
  | 'copy'
  | 'chevronUp'
  | 'barChart'
  | 'kebab'
  | 'checkCircleFilled';

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

      {name === 'settings' && (
        <>
          <Path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            {...shared}
          />
          <Circle cx="12" cy="12" r="3" {...shared} />
        </>
      )}

      {name === 'filePlus' && (
        <>
          <Path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" {...shared} />
          <Path d="M14 2v6h6" {...shared} />
          <Path d="M12 18v-6" {...shared} />
          <Path d="M9 15h6" {...shared} />
        </>
      )}

      {name === 'fork' && (
        <>
          <Circle cx="6" cy="4.5" r="2" {...shared} />
          <Circle cx="18" cy="4.5" r="2" {...shared} />
          <Circle cx="12" cy="19.5" r="2" {...shared} />
          <Path d="M6 6.5v2a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-2" {...shared} />
          <Path d="M12 12.5v5" {...shared} />
        </>
      )}

      {name === 'shieldCheck' && (
        <>
          <Path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" {...shared} />
          <Path d="M8.5 12l2.5 2.5 4.5-4.5" {...shared} />
        </>
      )}

      {name === 'workspace' && (
        <>
          <Rect x="2" y="7" width="20" height="13" rx="2" {...shared} />
          <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...shared} />
        </>
      )}

      {name === 'travelGroup' && (
        <>
          <Circle cx="9" cy="8" r="3.5" {...shared} />
          <Path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" {...shared} />
          <Path d="M16 5a3.5 3.5 0 0 1 0 6.6M21.5 20c0-2.9-1.9-5.4-4.5-6.2" {...shared} />
        </>
      )}

      {name === 'gitBranch' && (
        <>
          <Line x1="6" y1="3" x2="6" y2="15" {...shared} />
          <Circle cx="18" cy="6" r="3" {...shared} />
          <Circle cx="6" cy="18" r="3" {...shared} />
          <Path d="M18 9a9 9 0 0 1-9 9" {...shared} />
        </>
      )}

      {name === 'mapPin' && (
        <>
          <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" {...shared} />
          <Circle cx="12" cy="10" r="3" {...shared} />
        </>
      )}

      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="8" {...shared} />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" {...shared} />
        </>
      )}

      {name === 'plus' && (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...shared} />
          <Line x1="5" y1="12" x2="19" y2="12" {...shared} />
        </>
      )}

      {name === 'minus' && <Line x1="5" y1="12" x2="19" y2="12" {...shared} />}

      {name === 'trash' && (
        <>
          <Line x1="3" y1="6" x2="21" y2="6" {...shared} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" {...shared} />
          <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...shared} />
        </>
      )}

      {name === 'home' && (
        <>
          <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" {...shared} />
          <Polyline points="9 21 9 13 15 13 15 21" {...shared} />
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

      {name === 'chevronRight' && <Polyline points="9 18 15 12 9 6" {...shared} />}

      {name === 'camera' && (
        <>
          <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" {...shared} />
          <Circle cx="12" cy="13" r="3" {...shared} />
        </>
      )}

      {name === 'globe' && (
        <>
          <Circle cx="12" cy="12" r="10" {...shared} />
          <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...shared} />
          <Line x1="2" y1="12" x2="22" y2="12" {...shared} />
        </>
      )}

      {name === 'pencil' && (
        <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...shared} />
      )}

      {name === 'eye' && (
        <>
          <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...shared} />
          <Circle cx="12" cy="12" r="3" {...shared} />
        </>
      )}

      {name === 'checkCircle' && (
        <>
          <Circle cx="12" cy="12" r="10" {...shared} />
          <Polyline points="8 12 11 15 16 9" {...shared} />
        </>
      )}

      {name === 'link' && (
        <>
          <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" {...shared} />
          <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" {...shared} />
        </>
      )}

      {name === 'star' && (
        <Polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
          {...shared}
        />
      )}

      {name === 'starFilled' && (
        <Polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
          {...shared}
          fill={color}
        />
      )}

      {name === 'close' && (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...shared} />
          <Line x1="18" y1="6" x2="6" y2="18" {...shared} />
        </>
      )}

      {name === 'sliders' && (
        <>
          <Path d="M4 8h10M18 8h2M4 16h2M10 16h10" {...shared} />
          <Circle cx="16" cy="8" r="2.2" {...shared} />
          <Circle cx="8" cy="16" r="2.2" {...shared} />
        </>
      )}

      {name === 'heartFilled' && (
        <Path
          d="M12 21s-7.5-4.7-9.3-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.3 12c-1.8 4.3-9.3 9-9.3 9z"
          {...shared}
          fill={color}
        />
      )}

      {name === 'heart' && (
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          {...shared}
        />
      )}

      {name === 'heartSolid' && (
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          {...shared}
          fill={color}
        />
      )}

      {name === 'comment' && (
        <Path
          d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5c-1.7 0-3.3-.5-4.6-1.3L3 20l1.3-4.9A8.38 8.38 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"
          {...shared}
        />
      )}

      {name === 'bookmark' && (
        <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" {...shared} />
      )}

      {name === 'bell' && (
        <>
          <Path
            d="M12 2.5a5 5 0 0 0-5 5c0 4-1.7 5.5-1.7 5.5h13.4S17 11.5 17 7.5a5 5 0 0 0-5-5z"
            {...shared}
          />
          <Path d="M10.5 18.5a1.6 1.6 0 0 0 3 0" {...shared} />
        </>
      )}

      {name === 'partyPopper' && (
        <>
          <Path d="M5.8 11.3 2 22l10.7-3.8" {...shared} />
          <Path d="M4 3h.01" {...shared} />
          <Path d="M22 8h.01" {...shared} />
          <Path d="M15 2h.01" {...shared} />
          <Path d="M22 20h.01" {...shared} />
          <Path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" {...shared} />
          <Path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" {...shared} />
          <Path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" {...shared} />
          <Path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" {...shared} />
        </>
      )}

      {name === 'check' && (
        <>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...shared} />
          <Polyline points="22 4 12 14.01 9 11.01" {...shared} />
        </>
      )}

      {name === 'copy' && (
        <>
          <Rect x="3" y="3" width="12" height="12" rx="3" fill={color} />
          <Rect x="8" y="8" width="13" height="13" rx="3" fill="none" stroke={color} strokeWidth={2.5} />
        </>
      )}

      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="9.75" {...shared} />
          <Path d="M12 11.25V16.5M12 7.5v.3" {...shared} />
        </>
      )}

      {name === 'briefcase' && (
        <>
          <Path d="M2 10.3h20V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" fill={color} />
          <Path
            d="M2 6.5A1.5 1.5 0 0 1 3.5 5h17A1.5 1.5 0 0 1 22 6.5v2.3a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 8.8Z"
            fill={color}
          />
          <Path d="M9 5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" {...shared} strokeWidth={1.8} />
        </>
      )}

      {name === 'plusCircle' && (
        <>
          <Circle cx="12" cy="12" r="10" {...shared} />
          <Line x1="12" y1="8" x2="12" y2="16" {...shared} />
          <Line x1="8" y1="12" x2="16" y2="12" {...shared} />
        </>
      )}

      {name === 'filter' && (
        <>
          <Line x1="21" y1="5" x2="14" y2="5" {...shared} />
          <Line x1="10" y1="5" x2="3" y2="5" {...shared} />
          <Line x1="21" y1="12" x2="12" y2="12" {...shared} />
          <Line x1="8" y1="12" x2="3" y2="12" {...shared} />
          <Line x1="21" y1="19" x2="16" y2="19" {...shared} />
          <Line x1="12" y1="19" x2="3" y2="19" {...shared} />
          <Line x1="14" y1="3" x2="14" y2="7" {...shared} />
          <Line x1="10" y1="10" x2="10" y2="14" {...shared} />
          <Line x1="16" y1="17" x2="16" y2="21" {...shared} />
        </>
      )}

      {name === 'pencilSquare' && (
        <>
          <Path
            d="M18.15 1.95a2.03 2.03 0 0 1 2.85 2.85l-10.05 10.05-3.75.9.9-3.75 10.05-10.05z"
            fill={color}
            stroke="none"
          />
          <Path
            d="M16.8 13.2V19.5a2.4 2.4 0 0 1-2.4 2.4H4.5A2.4 2.4 0 0 1 2.1 19.5V9.9A2.4 2.4 0 0 1 4.5 7.5h6.3"
            {...shared}
            strokeWidth={2.25}
          />
        </>
      )}

      {name === 'userPlus' && (
        <>
          <Circle cx="9.6" cy="7.54" r="4.29" {...shared} strokeWidth={2.74} />
          <Path
            d="M2.06 21.26c1.03-3.77 3.94-5.83 7.54-5.83 2.57 0 4.97 1.03 6.34 3.09"
            {...shared}
            strokeWidth={2.74}
          />
          <Path d="M19.37 10.63v6.86M15.94 14.06h6.86" {...shared} strokeWidth={2.74} />
        </>
      )}

      {name === 'calendarPlus' && (
        <>
          <Rect x="2.4" y="3.9" width="19.2" height="18" rx="2.7" {...shared} strokeWidth={2.4} />
          <Path d="M7.2 1.5v4.5M16.8 1.5v4.5M2.4 9.3h19.2" {...shared} strokeWidth={2.4} />
          <Path d="M12 12.6v5.7M9.15 15.45h5.7" {...shared} strokeWidth={2.4} />
        </>
      )}

      {name === 'grip' && <Path d="M4.5 6.3h15M4.5 12h15M4.5 17.7h15" {...shared} strokeWidth={3} />}

      {name === 'chevronUp' && <Polyline points="6 15 12 9 18 15" {...shared} />}

      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="9.6" {...shared} strokeWidth={2.67} />
          <Path d="M12 6.93V12l3.47 2.4" {...shared} strokeWidth={2.67} />
        </>
      )}

    </Svg>
  );
}
