import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Tag, IconBtn } from './Controls';
import { Txt } from './Txt';
import { AppIcon, AppIconName } from './AppIcon';

export interface KpiSpec {
  icon: string; value: ReactNode; label: string; tag?: string; tone?: 'g' | 'r' | ''; onPress?: () => void;
}

export function Kpi({ icon, value, label, tag, tone, onPress }: KpiSpec) {
  const iconMap: Record<string, AppIconName> = { activity: 'activity', 'chart-no-axes': 'chart-no-axes', wallet: 'wallet', 'pie-chart': 'pie-chart', 'check-circle': 'check-circle', users: 'users', 'building-2': 'building-2', 'clock-alert': 'clock-alert', settings: 'settings', 'shield-alert': 'shield-alert', 'file-pen': 'file-pen' };
  const iconName = iconMap[icon];
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <IconBtn size={36} fontSize={13.4} label={icon}>{iconName ? <AppIcon name={iconName} size={17} /> : undefined}</IconBtn>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {typeof value === 'string' || typeof value === 'number' ? <Txt size={14.7} weight={500}>{value}</Txt> : value}
          {tag ? <Tag tone={tone}>{tag}</Tag> : null}
        </View>
        <Txt size={9.5} mut lh={1.25}>{label}</Txt>
      </View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable> : body;
}

export function Heading({ title, kpis, sub }: { title: string; kpis?: KpiSpec[]; sub?: string }) {
  return (
    <View>
      <Txt size={22.1} lh={1.08} ls={-0.2}>{title.replace('<br>', '\n')}</Txt>
      {sub ? <Txt size={12} mut style={{ marginTop: 4 }}>{sub}</Txt> : null}
      {kpis?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 14 }}>
          {kpis.map((k, i) => <Kpi key={i} {...k} />)}
        </View>
      ) : <View style={{ height: 14 }} />}
    </View>
  );
}
