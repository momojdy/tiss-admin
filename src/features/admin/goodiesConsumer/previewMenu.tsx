import React from 'react';
import Svg,{Circle,Path,Rect,Line,Polyline,G} from 'react-native-svg';
export function ThinMenuIcon({ name, color }: { name: string; color: string }) {
  const common = { fill: 'none' as const, stroke: color, strokeWidth: 1.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes: Record<string, React.ReactNode> = {
    'message-circle': <Path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.95L3 20l.95-4.5a9 9 0 0 1-.95-4A8.5 8.5 0 0 1 11.5 3 8.5 8.5 0 0 1 20 11.5Z" />,
    bell: <><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9Z" /><Path d="M10 21h4" /></>,
    'credit-card': <><Rect x="2.5" y="5" width="19" height="14" rx="2.5" /><Line x1="2.5" y1="10" x2="21.5" y2="10" /><Line x1="6" y1="15" x2="10" y2="15" /></>,
    heart: <Path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" />,
    package: <><Path d="M12 2.5 21 7v10l-9 4.5L3 17V7Z" /><Path d="M3 7l9 4.5L21 7M12 11.5v10M7.5 4.75l9 4.5" /></>,
    clock: <><Circle cx="12" cy="12" r="9" /><Polyline points="12,6 12,12 16,14" /></>,
    'help-circle': <><Circle cx="12" cy="12" r="9" /><Path d="M9.4 9a2.8 2.8 0 0 1 5.3 1.3c0 2-2.7 2.1-2.7 4" /><Circle cx="12" cy="17.5" r=".5" fill={color} stroke="none" /></>,
    'edit-3': <><Path d="M12 20H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10" /><Path d="m10 15 8.8-8.8a2 2 0 0 1 2.8 2.8L12.8 17.8 9 19Z" /></>,
    briefcase: <><Rect x="3" y="7" width="18" height="14" rx="2" /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 3 13 3 18 0" /></>,
    sun: <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <Path d="M20.5 15.8A8.8 8.8 0 0 1 8.2 3.5a8.8 8.8 0 1 0 12.3 12.3Z" />,
  };
  return <Svg width={26} height={26} viewBox="0 0 24 24"><G {...common}>{shapes[name]}</G></Svg>;
}