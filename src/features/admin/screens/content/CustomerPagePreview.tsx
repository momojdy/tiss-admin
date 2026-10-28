import { AppIcon } from '../../ui/AppIcon';
import { Pressable, ScrollView, Text, View } from 'react-native';

type ElementData = Record<string, any>;
type PageData = { title?: string; order?: string[]; els?: Record<string, ElementData> };
type PageModel = { pages?: Record<string, PageData> };
export type CustomerPreviewMode = 'Edit' | 'Preview';
export type CustomerPreviewView = 'Draft' | 'Published';

const ink = '#161A17';
const muted = '#7B7D76';
const border = 'rgba(0,0,0,.08)';
const card = 'rgba(251,250,245,.94)';
const colors: Record<string, string> = {
  'Wantiss brand': '#2F5D4E', 'Goodies brand': '#FD802E', 'Stays brand': '#2F5D4E',
  'Flyz brand': '#28469E', 'Konsoliss brand': '#D1481D', 'Sunset': '#F2C94C',
};

function targetPage(destination: unknown, payload: PageModel): string | null {
  if (typeof destination !== 'string' || !destination.startsWith('page:')) return null;
  const raw = destination.slice(5);
  const candidates = [raw, raw.replace(/^svc:/, ''), raw.replace(/^tab:/, '')];
  return candidates.find((key) => Boolean(payload.pages?.[key])) || null;
}

function ElementView({ id, element, page, payload, mode, selectedElementKey, onSelectElement, onNavigate, depth = 0 }: {
  id: string;
  element: ElementData;
  page: PageData;
  payload: PageModel;
  mode: CustomerPreviewMode;
  selectedElementKey?: string;
  onSelectElement?: (id: string) => void;
  onNavigate?: (pageKey: string) => void;
  depth?: number;
}) {
  if (!element || !element.vis) return null;
  const background = colors[element.img?.k] || (element.bg === 'tint' ? '#EEF0E4' : card);
  const title = String(element.title || element.label || element.text || element.t || id);
  const sub = String(element.sub || '');
  const selected = mode === 'Edit' && selectedElementKey === id;
  const linkedPage = targetPage(element.dest, payload);
  const content = (() => {
    if (element.t === 'section') return (
      <View style={{ marginTop: 10, marginHorizontal: 8, padding: 8, borderRadius: 10, backgroundColor: element.bg === 'tint' ? '#EEF0E4' : 'transparent', borderWidth: 1, borderColor: element.bg === 'none' ? 'transparent' : border }}>
        <Text style={{ color: ink, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{element.title || 'Section'}</Text>
        <View style={{ flexDirection: element.layout === 'grid' ? 'row' : 'column', flexWrap: 'wrap', gap: 6 }}>
          {(element.kids || []).map((child: string) => page.els?.[child] ? <View key={child} style={{ flex: element.layout === 'grid' ? 1 : undefined, minWidth: element.layout === 'grid' ? 84 : undefined }}><ElementView id={child} element={page.els[child]} page={page} payload={payload} mode={mode} selectedElementKey={selectedElementKey} onSelectElement={onSelectElement} onNavigate={onNavigate} depth={depth + 1} /></View> : null)}
        </View>
      </View>
    );
    if (element.t === 'logo') return <View style={{ marginHorizontal: 8, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 23, height: 23, borderRadius: 7, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>w</Text></View><Text style={{ color: ink, fontSize: 13, fontWeight: '600' }}>{element.label || 'wantiss'}</Text></View>;
    if (element.t === 'hero') return <View style={{ marginHorizontal: 8, marginTop: 5, padding: 12, minHeight: 88, borderRadius: 13, backgroundColor: background }}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{element.title || 'Hero title'}</Text><Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{element.sub || ''}</Text>{element.label ? <Text style={{ alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#fff', color: ink, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, fontSize: 9 }}>{element.label}</Text> : null}</View>;
    if (element.t === 'tile') return <View style={{ padding: 8, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: card, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: ink, fontSize: 10, fontWeight: '600' }}>{element.label || title}</Text><Text style={{ color: muted, fontSize: 8, marginTop: 3 }} numberOfLines={1}>{element.dest || 'No destination'}</Text></View>;
    if (element.t === 'card') return <View style={{ marginTop: 4, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: background }}><Text style={{ color: ink, fontSize: 11, fontWeight: '600' }}>{element.title || 'Card title'}</Text>{sub ? <Text style={{ color: muted, fontSize: 9, marginTop: 3 }}>{sub}</Text> : null}{element.label ? <Text style={{ color: '#2F5D4E', fontSize: 9, fontWeight: '600', marginTop: 5 }}>{element.label}</Text> : null}{element.btn ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}><AppIcon name="file-pen" size={10} color={ink} /><Text style={{ color: ink, fontSize: 9 }}>{element.btn}</Text></View> : null}</View>;
    if (element.t === 'btn') return <View style={{ alignSelf: 'flex-start', marginHorizontal: 10, marginTop: 10, backgroundColor: ink, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: '#fff', fontSize: 9 }}>{element.label || 'Button'}</Text></View>;
    return <View style={{ marginTop: 5, marginHorizontal: 8, padding: 8, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border }}><Text style={{ color: ink, fontSize: 10, fontWeight: '500' }}>{title}</Text>{sub ? <Text style={{ color: muted, fontSize: 9, marginTop: 3 }}>{sub}</Text> : null}</View>;
  })();
  return (
    <Pressable
      disabled={mode === 'Edit' ? !onSelectElement : !linkedPage || !onNavigate}
      onPress={() => mode === 'Edit' ? onSelectElement?.(id) : linkedPage && onNavigate?.(linkedPage)}
      accessibilityRole="button"
      accessibilityLabel={mode === 'Edit' ? 'Select ' + title : 'Open ' + title}
      style={{ borderWidth: selected ? 2 : 0, borderColor: '#FD802E', borderRadius: 8, borderStyle: selected ? 'dashed' : 'solid', opacity: selected ? 1 : 1 }}
    >
      {content}
    </Pressable>
  );
}

export function CustomerPagePreview({ payload, pageKey, mode = 'Preview', view = 'Draft', selectedElementKey, pageStack = [], onSelectElement, onNavigate, onBack }: {
  payload: PageModel;
  pageKey: string;
  mode?: CustomerPreviewMode;
  view?: CustomerPreviewView;
  selectedElementKey?: string;
  pageStack?: string[];
  onSelectElement?: (id: string) => void;
  onNavigate?: (pageKey: string) => void;
  onBack?: () => void;
}) {
  const page = payload?.pages?.[pageKey];
  const pageKeys = Object.keys(payload?.pages || {});
  if (!page) return <View style={{ alignSelf: 'center', width: 262, minHeight: 360, borderWidth: 6, borderColor: '#252529', borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 22 }}><Text style={{ color: muted, fontSize: 11, textAlign: 'center' }}>Select or create a customer page to preview it here.</Text></View>;
  const order = (page.order || Object.keys(page.els || {})).filter((id) => page.els?.[id]);
  return (
    <View style={{ alignSelf: 'center', width: 280, maxWidth: '100%', borderWidth: 6, borderColor: '#252529', borderRadius: 30, overflow: 'hidden', backgroundColor: '#fff' }}>
      <View style={{ height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><View style={{ width: 64, height: 5, borderRadius: 4, backgroundColor: '#252529' }} /></View>
      <View style={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8, borderBottomWidth: 1, borderColor: border, backgroundColor: '#fff' }}>
        <Text style={{ color: muted, fontSize: 8 }}>CUSTOMER PAGE · {view.toUpperCase()} {mode === 'Edit' && view === 'Draft' ? '· EDIT MODE' : '· PREVIEW MODE'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {pageStack.length > 0 && onBack ? <Pressable onPress={onBack} style={{ paddingHorizontal: 5, paddingVertical: 3 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><AppIcon name="arrow-left" size={12} color="#2F5D4E" /><Text style={{ color: '#2F5D4E', fontSize: 10 }}>Back</Text></View></Pressable> : null}
          <Text style={{ color: ink, fontSize: 12, fontWeight: '600', flex: 1 }}>{page.title || pageKey}</Text>
        </View>
      </View>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 520, minHeight: 310 }} contentContainerStyle={{ paddingTop: 5, paddingBottom: 12 }}>
        {order.map((id) => <ElementView key={id} id={id} element={page.els![id]} page={page} payload={payload} mode={mode} selectedElementKey={selectedElementKey} onSelectElement={onSelectElement} onNavigate={onNavigate} />)}
        {order.length === 0 ? <Text style={{ color: muted, fontSize: 10, textAlign: 'center', padding: 22 }}>This page has no visible elements yet.</Text> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: border, paddingVertical: 9, backgroundColor: '#fff' }}>
        {pageKeys.slice(0, 4).map((key) => <Pressable key={key} disabled={mode === 'Edit' || !onNavigate} onPress={() => onNavigate?.(key)} style={{ paddingHorizontal: 5, paddingVertical: 3 }}><Text numberOfLines={1} style={{ color: key === pageKey ? '#2F5D4E' : muted, fontSize: 8, fontWeight: key === pageKey ? '700' : '400' }}>{payload.pages?.[key]?.title || key}</Text></Pressable>)}
      </View>
      <View style={{ height: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><View style={{ width: 72, height: 3, borderRadius: 3, backgroundColor: '#D5D5D5' }} /></View>
    </View>
  );
}
