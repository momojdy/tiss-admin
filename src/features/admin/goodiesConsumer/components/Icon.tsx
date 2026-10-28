import React from 'react';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

type Shape = ['path' | 'circle' | 'rect', Record<string, string>];
export const ICONS: Record<string, Shape[]> = {"chevD": [["path", {"d": "M6 9l6 6 6-6"}]], "chevR": [["path", {"d": "M9 5l7 7-7 7"}]], "chevL": [["path", {"d": "M15 5l-7 7 7 7"}]], "plus": [["path", {"d": "M12 5v14M5 12h14"}]], "minus": [["path", {"d": "M5 12h14"}]], "check": [["path", {"d": "M5 12l5 5 9-10"}]], "x": [["path", {"d": "M6 6l12 12M18 6L6 18"}]], "pin": [["path", {"d": "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"}], ["circle", {"cx": "12", "cy": "9.5", "r": "2.5"}]], "bell": [["path", {"d": "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"}], ["path", {"d": "M10 21a2.2 2.2 0 0 0 4 0"}]], "gear": [["circle", {"cx": "12", "cy": "12", "r": "3"}], ["path", {"d": "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"}]], "search": [["circle", {"cx": "11", "cy": "11", "r": "7"}], ["path", {"d": "M20 20l-3.5-3.5"}]], "heart": [["path", {"d": "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"}]], "star": [["path", {"d": "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z"}]], "home": [["path", {"d": "M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"}]], "grid": [["rect", {"x": "4", "y": "4", "width": "7", "height": "7", "rx": "2"}], ["rect", {"x": "13", "y": "4", "width": "7", "height": "7", "rx": "2"}], ["rect", {"x": "4", "y": "13", "width": "7", "height": "7", "rx": "2"}], ["rect", {"x": "13", "y": "13", "width": "7", "height": "7", "rx": "2"}]], "bag": [["path", {"d": "M6 8h12l1 12H5z"}], ["path", {"d": "M9 8V6a3 3 0 0 1 6 0v2"}]], "cart": [["path", {"d": "M3 4h2.5l2.2 11h10.1l1.9-8H6.3"}], ["circle", {"cx": "9", "cy": "19.5", "r": "1.4"}], ["circle", {"cx": "17", "cy": "19.5", "r": "1.4"}]], "clock": [["circle", {"cx": "12", "cy": "12", "r": "8.5"}], ["path", {"d": "M12 7.5V12l3 2"}]], "wallet": [["path", {"d": "M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14h2"}]], "card": [["rect", {"x": "3", "y": "5", "width": "18", "height": "14", "rx": "2"}], ["path", {"d": "M3 10h18"}]], "phone": [["path", {"d": "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"}]], "trash": [["path", {"d": "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"}]], "msg": [["path", {"d": "M4 5h16v11H9l-5 4z"}]], "user": [["circle", {"cx": "12", "cy": "8", "r": "4"}], ["path", {"d": "M4 20c1-4 4-6 8-6s7 2 8 6"}]], "help": [["circle", {"cx": "12", "cy": "12", "r": "9"}], ["path", {"d": "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"}]], "moon": [["path", {"d": "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"}]], "tag": [["path", {"d": "M3 12V4h8l9 9-8 8z"}], ["circle", {"cx": "7.5", "cy": "8.5", "r": "1.2"}]], "undo": [["path", {"d": "M9 14L4 9l5-5"}], ["path", {"d": "M4 9h10a6 6 0 0 1 0 12h-3"}]]};

export function Icon({name, size = 20, color = '#1B1B1F', fill = false}: {name: string; size?: number; color?: string; fill?: boolean}) {
  const shapes = ICONS[name] || ICONS.store;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {shapes.map(([t, a], i) => {
        if (t === 'path') return <Path key={i} d={a.d} fill={name === 'heart' && fill ? color : undefined} />;
        if (t === 'circle') return <Circle key={i} cx={a.cx} cy={a.cy} r={a.r} />;
        return <Rect key={i} x={a.x} y={a.y} width={a.width} height={a.height} rx={a.rx} />;
      })}
    </Svg>
  );
}

Object.assign(ICONS, {
  utensils: [["path", {d: "M4 3v7a3 3 0 0 0 6 0V3M7 3v18M16 3v18M16 3c3 2 4 5 4 8h-4"}]],
  leaf: [["path", {d: "M20 4C10 4 4 8 4 15a5 5 0 0 0 5 5c7 0 11-6 11-16Z"}], ["path", {d: "M4 21c3-6 7-9 13-13"}]],
  cup: [["path", {d: "M5 4h14l-1 16H6L5 4Z"}], ["path", {d: "M7 8h10"}]],
  bread: [["path", {d: "M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10H4V10Z"}], ["path", {d: "M9 7v4M15 7v4"}]],
  beef: [["path", {d: "M4 13c-2-3 0-7 4-7 2 0 3 1 4 2 3-2 7 0 8 3 2 4-2 8-6 8H9c-3 0-5-2-5-6Z"}], ["circle", {cx: "14", cy: "13", r: "2"}]],
  globe: [["circle", {cx: "12", cy: "12", r: "9"}], ["path", {d: "M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"}]],
  spray: [["path", {d: "M8 7h8l1 14H7L8 7Z"}], ["path", {d: "M9 7V4h7l2 2M16 4h4"}]],
  pill: [["path", {d: "M7 17a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-3 3a5 5 0 0 1-7 0Z"}], ["path", {d: "m9 9 6 6"}]],
  bike: [["circle", {cx: "6", cy: "17", r: "3"}], ["circle", {cx: "18", cy: "17", r: "3"}], ["path", {d: "M6 17l4-8h4l4 8M10 9l-2-3H5M12 13h5"}]],
  gift: [["rect", {x: "3", y: "9", width: "18", height: "12", rx: "1"}], ["path", {d: "M2 9h20v-4H2zM12 5v16M12 5C8 1 5 4 8 7M12 5c4-4 7-1 4 2"}]],
  flame: [["path", {d: "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 3-3 4-3 6-2-1-3-3-3-5-3 3-5 6-5 10a8 8 0 0 0 8 6Z"}]],
  idcard: [["rect", {x: "3", y: "5", width: "18", height: "14", rx: "2"}], ["circle", {cx: "8", cy: "11", r: "2"}], ["path", {d: "M5 16c1-2 5-2 6 0M13 10h5M13 14h5"}]],
  mail: [["rect", {x: "3", y: "5", width: "18", height: "14", rx: "2"}], ["path", {d: "m4 7 8 6 8-6"}]],
  file: [["path", {d: "M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7"}]],
  package: [["path", {d: "m3 7 9-4 9 4v10l-9 4-9-4V7Z"}], ["path", {d: "m3 7 9 4 9-4M12 11v10M8 5l9 4"}]],
  lock: [["rect", {x: "4", y: "10", width: "16", height: "11", rx: "2"}], ["path", {d: "M8 10V7a4 4 0 0 1 8 0v3"}]],
  zap: [["path", {d: "M13 2 4 14h7l-1 8 10-13h-7z"}]],
  store: [["path", {d: "M3 10h18l-2-6H5l-2 6Z"}], ["path", {d: "M5 10v10h14V10M9 20v-6h6v6"}]],
  receipt: [["path", {d: "M5 3l2 2 2-2 3 2 3-2 2 2 2-2v18l-3-2-2 2-3-2-2 2-2-2-2 2z"}], ["path", {d: "M9 9h6M9 13h6M9 17h4"}]],
  pizza: [["path", {d: "M3 5c6-3 12-3 18 0l-8 16L3 5Z"}], ["circle", {cx: "9", cy: "8", r: "1"}], ["circle", {cx: "12", cy: "13", r: "1"}]],
  burger: [["path", {d: "M4 9a8 8 0 0 1 16 0H4ZM3 12h18v3H3zM4 18h16l-1 3H5z"}]],
});
