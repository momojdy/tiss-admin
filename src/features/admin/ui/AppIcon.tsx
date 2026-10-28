import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

export type AppIconName = 'search' | 'bell' | 'user-round' | 'menu' | 'settings' | 'download' | 'clipboard-list' | 'history' | 'users' | 'building-2' | 'clock-alert' | 'activity' | 'chart-no-axes' | 'wallet' | 'pie-chart' | 'check-circle' | 'shield-alert' | 'file-pen' | 'plus' | 'star' | 'star-filled' | 'mail' | 'x' | 'chevron-down' | 'chevron-right' | 'arrow-up-right' | 'arrow-left' | 'filter' | 'check';

export function AppIcon({ name, size = 18, color }: { name: AppIconName; size?: number; color?: string }) {
  const { c } = useTheme();
  const stroke = color || c.ink;
  const common = { stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'mail' ? <><Rect x="3" y="5" width="18" height="14" rx="2" {...common} /><Path d="m4 7 8 6 8-6" {...common} /></> : null}
      {name === 'x' ? <><Line x1="6" y1="6" x2="18" y2="18" {...common} /><Line x1="18" y1="6" x2="6" y2="18" {...common} /></> : null}
      {name === 'chevron-down' ? <Path d="m6 9 6 6 6-6" {...common} /> : null}
      {name === 'chevron-right' ? <Path d="m9 6 6 6-6 6" {...common} /> : null}
      {name === 'arrow-left' ? <><Path d="M19 12H5m7 7-7-7 7-7" {...common} /></> : null}
      {name === 'arrow-up-right' ? <><Path d="M7 17 17 7M8 7h9v9" {...common} /></> : null}
      {name === 'filter' ? <><Path d="M4 6h16M7 12h10M10 18h4" {...common} /></> : null}
      {name === 'check' ? <Path d="m5 12 4 4L19 6" {...common} /> : null}
      {name === 'star' || name === 'star-filled' ? <Path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" {...common} fill={name === 'star-filled' ? stroke : 'none'} /> : null}
      {name === 'plus' ? <><Line x1="12" y1="5" x2="12" y2="19" {...common} /><Line x1="5" y1="12" x2="19" y2="12" {...common} /></> : null}
      {name === 'search' ? <><Circle cx="10.8" cy="10.8" r="6.8" {...common} /><Line x1="16" y1="16" x2="21" y2="21" {...common} /></> : null}
      {name === 'bell' ? <><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...common} /><Path d="M10 21h4" {...common} /></> : null}
      {name === 'user-round' ? <><Circle cx="12" cy="8" r="3.2" {...common} /><Path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" {...common} /></> : null}
      {name === 'menu' ? <><Line x1="4" y1="6" x2="20" y2="6" {...common} /><Line x1="4" y1="12" x2="20" y2="12" {...common} /><Line x1="4" y1="18" x2="20" y2="18" {...common} /></> : null}
      {name === 'settings' ? <><Circle cx="12" cy="12" r="3" {...common} /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8-.1 1.7 1.7 0 0 0-1 1.5v.2h-3.6v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.1l-.2.1-1.8-3.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.5-1H5v-3.6h.5A1.7 1.7 0 0 0 7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8.1 1.7 1.7 0 0 0 1-1.5v-.2h3.6v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.1l.2-.1 1.8 3.1-.1.1A1.7 1.7 0 0 0 19 9a1.7 1.7 0 0 0 1.5 1h.5v3.6h-.5a1.7 1.7 0 0 0-1.1 1.4" {...common} /></> : null}
      {name === 'download' ? <><Path d="M12 3v12m-5-5 5 5 5-5" {...common} /><Path d="M5 17v3h14v-3" {...common} /></> : null}
      {name === 'clipboard-list' ? <><Rect x="5" y="4" width="14" height="17" rx="2" {...common} /><Path d="M9 4V2h6v2M8 10h8M8 14h8M8 18h4" {...common} /></> : null}
      {name === 'history' ? <><Path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" {...common} /><Path d="M3 3v5h5M12 7v5l3 2" {...common} /></> : null}
      {name === 'users' ? <><Circle cx="9" cy="8" r="3" {...common} /><Path d="M3 20c.5-3.5 2.5-5.5 6-5.5s5.5 2 6 5.5M16 5.5a3 3 0 0 1 0 5.8M17 15c2.3.5 3.6 2.1 4 5" {...common} /></> : null}
      {name === 'building-2' ? <><Rect x="4" y="3" width="16" height="18" rx="1" {...common} /><Path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" {...common} /></> : null}
      {name === 'clock-alert' ? <><Circle cx="12" cy="12" r="9" {...common} /><Path d="M12 7v5l3 2M18.5 3.5l2 2" {...common} /></> : null}
      {name === 'activity' ? <><Path d="M3 12h4l3-7 4 14 3-7h4" {...common} /></> : null}
      {name === 'chart-no-axes' ? <><Path d="M4 19V5M4 19h16" {...common} /><Path d="m7 15 4-4 3 2 5-6" {...common} /></> : null}
      {name === 'wallet' ? <><Rect x="3" y="6" width="18" height="14" rx="2" {...common} /><Path d="M3 9h18M15 14h3" {...common} /></> : null}
      {name === 'pie-chart' ? <><Path d="M12 3v9h9A9 9 0 1 1 12 3Z" {...common} /><Path d="M15 3.5A9 9 0 0 1 20.5 9H15Z" {...common} /></> : null}
      {name === 'check-circle' ? <><Circle cx="12" cy="12" r="9" {...common} /><Path d="m8 12 2.5 2.5L16.5 9" {...common} /></> : null}
      {name === 'shield-alert' ? <><Path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" {...common} /><Path d="M12 8v4M12 16h.01" {...common} /></> : null}
      {name === 'file-pen' ? <><Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7" {...common} /><Path d="M14 2v6h6M8 13h5M8 17h3M16 20l4-4 2 2-4 4-3 1Z" {...common} /></> : null}
    </Svg>
  );
}
