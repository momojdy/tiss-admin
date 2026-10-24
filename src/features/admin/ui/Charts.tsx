import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';

/** Catmull-Rom style smoothing, ported from `smooth()` in the HTML. */
export function smoothPath(p: number[][]): string {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += `C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`;
  }
  return d;
}

const MONTHS = 'Nov Dec Jan Feb Mar Apr May Jun Jul Aug Sep Oct'.split(' ');

/** `line(...)`: area line chart with optional dashed target line. viewBox matches the HTML (405 x 160). */
export function LineChart({ vals, color, max, fill = true, dash, labels, yLabels }: {
  vals: number[]; color: string; max: number; fill?: boolean; dash?: boolean; labels?: string[]; yLabels?: string[];
}) {
  const W = 395, H = 130, L = 24;
  const pts = vals.map((v, i) => [L + (i * (W - L)) / (vals.length - 1), H - (v / max) * H]);
  const d = smoothPath(pts);
  const l = labels ?? ['Nov', 'Jan', 'Mar', 'May', 'Jul', 'Sep', 'Oct'];
  const yl = yLabels ?? ['$200K', '$100K', '$0'];
  const n = l.length, k = n > 7 ? 2 : 1;
  const pl = n === vals.length ? l : MONTHS;
  const gid = 'g' + color.replace('#', '');
  return (
    <Svg viewBox={`0 0 ${W + 10} ${H + 30}`} width="100%" height={((H + 30) / (W + 10)) * 300}>
      <Defs>
        <SvgGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <G>
        <SvgText x="0" y="8" fontSize="12" fill="#8b8d85">{yl[0]}</SvgText>
        <SvgText x="0" y={H / 2 + 4} fontSize="12" fill="#8b8d85">{yl[1]}</SvgText>
        <SvgText x="0" y={H + 3} fontSize="12" fill="#8b8d85">{yl[2]}</SvgText>
      </G>
      {dash ? <Line x1={L} x2={W} y1={H * 0.32} y2={H * 0.32} stroke="#161a17" strokeDasharray="3 3" /> : null}
      {fill ? <Path d={`${d}L${W},${H}L${L},${H}Z`} fill={`url(#${gid})`} /> : null}
      <Path d={d} fill="none" stroke={color} strokeWidth={1.8} />
      <G>
        {l.map((m, i) => (i % k ? null : <SvgText key={i} x={L + (i * (W - L)) / (n - 1)} y={H + 16} fontSize="12" fill="#8b8d85" textAnchor="middle">{m}</SvgText>))}
      </G>
      {pl.length ? null : null}
    </Svg>
  );
}

/** Plain smooth line (approval-rate trend). */
export function SparkLine({ points, color, width = 380, height = 90 }: { points: number[][]; color: string; width?: number; height?: number }) {
  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width="100%" height={(height / width) * 300}>
      <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/** `.ring`: progress ring (the HTML uses a conic gradient). */
export function Ring({ pct, size = 96, color = '#f2c94c', track = 'rgba(255,255,255,0.15)', inner = '#2d5e4f', children }: {
  pct: number; size?: number; color?: string; track?: string; inner?: string; children?: React.ReactNode;
}) {
  const r = size / 2, stroke = 7, rr = r - stroke / 2, circ = 2 * Math.PI * rr;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={r} cy={r} r={r} fill={track} />
        <Circle cx={r} cy={r} r={rr} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="butt" transform={`rotate(-90 ${r} ${r})`} />
        <Circle cx={r} cy={r} r={r - 7} fill={inner} />
      </Svg>
      {children}
    </View>
  );
}

/** `.don`: donut with segments (fractions summing to 1). */
export function Donut({ parts, size = 110, hole, children }: { parts: { pct: number; color: string }[]; size?: number; hole: string; children?: React.ReactNode }) {
  const r = size / 2, w = 14, rr = r - w / 2, circ = 2 * Math.PI * rr;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center', marginVertical: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {parts.map((p, i) => {
          const len = (p.pct / 100) * circ, off = (acc / 100) * circ;
          acc += p.pct;
          return <Circle key={i} cx={r} cy={r} r={rr} fill="none" stroke={p.color} strokeWidth={w} strokeDasharray={`${len} ${circ}`} strokeDashoffset={-off} transform={`rotate(-90 ${r} ${r})`} />;
        })}
        <Circle cx={r} cy={r} r={r - w} fill={hole} />
      </Svg>
      {children}
    </View>
  );
}

/** `.sk`: vertical bars / stacked bars. Each column is a list of stacked segments (height in %). */
export function BarColumns({ columns, height = 170, gap = 4, track }: { columns: { segs: { pct: number; color: string }[] }[]; height?: number; gap?: number; track?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap, marginTop: 8 }}>
      {columns.map((col, i) => (
        <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', backgroundColor: track ?? c.inset, borderRadius: 10, overflow: 'hidden' }}>
          {col.segs.map((s, j) => <View key={j} style={{ height: `${Math.max(0, s.pct)}%`, backgroundColor: s.color }} />)}
        </View>
      ))}
    </View>
  );
}

/** `.mo`: month labels row. */
export const AxisLabels = ({ labels, marginLeft = 0, boldLast }: { labels: string[]; marginLeft?: number; boldLast?: boolean }) => (
  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, marginLeft }}>
    {labels.map((m, i) => (
      <View key={i} style={{ flex: 1, alignItems: 'center' }}>
        <Txt size={9.5} mut={!(boldLast && i === labels.length - 1)} weight={boldLast && i === labels.length - 1 ? 600 : 400}>{m}</Txt>
      </View>
    ))}
  </View>
);

/** `.ax`: y-axis labels column. */
export const YAxis = ({ labels, height }: { labels: string[]; height: number }) => (
  <View style={{ height, justifyContent: 'space-between', marginTop: 8, paddingRight: 4 }}>
    {labels.map((x, i) => <Txt key={i} size={9.5} mut>{x}</Txt>)}
  </View>
);
