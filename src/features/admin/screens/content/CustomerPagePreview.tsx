import { ScrollView, Text, View } from 'react-native';

type ElementData = Record<string, any>;
type PageData = { title?: string; order?: string[]; els?: Record<string, ElementData> };
type PageModel = { pages?: Record<string, PageData> };

const ink = '#161A17';
const muted = '#7B7D76';
const border = 'rgba(0,0,0,.08)';
const card = 'rgba(251,250,245,.94)';
const colors: Record<string, string> = {
  'Wantiss brand': '#2F5D4E', 'Goodies brand': '#FD802E', 'Stays brand': '#2F5D4E',
  'Flyz brand': '#28469E', 'Konsoliss brand': '#D1481D', 'Sunset': '#F2C94C',
};

function ElementView({ id, element, page, depth = 0 }: { id: string; element: ElementData; page: PageData; depth?: number }) {
  if (!element || !element.vis) return null;
  const background = colors[element.img?.k] || (element.bg === 'tint' ? '#EEF0E4' : card);
  const title = String(element.title || element.label || element.text || element.t || id);
  const sub = String(element.sub || '');
  if (element.t === 'section') {
    return (
      <View style={{ marginTop: 13, marginHorizontal: 10, padding: 9, borderRadius: 12, backgroundColor: element.bg === 'tint' ? '#EEF0E4' : 'transparent', borderWidth: 1, borderColor: element.bg === 'none' ? 'transparent' : border }}>
        <Text style={{ color: ink, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{element.title || 'Section'}</Text>
        <View style={{ flexDirection: element.layout === 'grid' ? 'row' : 'column', flexWrap: 'wrap', gap: 6 }}>
          {(element.kids || []).map((child: string) => page.els?.[child] ? <View key={child} style={{ flex: element.layout === 'grid' ? 1 : undefined, minWidth: element.layout === 'grid' ? 84 : undefined }}><ElementView id={child} element={page.els[child]} page={page} depth={depth + 1} /></View> : null)}
        </View>
      </View>
    );
  }
  if (element.t === 'logo') {
    return <View style={{ marginHorizontal: 10, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 23, height: 23, borderRadius: 7, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>w</Text></View><Text style={{ color: ink, fontSize: 13, fontWeight: '600' }}>{element.label || 'wantiss'}</Text></View>;
  }
  if (element.t === 'hero') {
    return <View style={{ marginHorizontal: 10, marginTop: 5, padding: 12, minHeight: 88, borderRadius: 13, backgroundColor: background }}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{element.title || 'Hero title'}</Text><Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{element.sub || ''}</Text>{element.label ? <Text style={{ alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#fff', color: ink, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, fontSize: 9 }}>{element.label}</Text> : null}</View>;
  }
  if (element.t === 'tile') {
    return <View style={{ padding: 8, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: card, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: ink, fontSize: 10, fontWeight: '600' }}>{element.label || title}</Text><Text style={{ color: muted, fontSize: 8, marginTop: 3 }} numberOfLines={1}>{element.dest || 'No destination'}</Text></View>;
  }
  if (element.t === 'card') {
    return <View style={{ marginTop: 4, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: background }}><Text style={{ color: ink, fontSize: 11, fontWeight: '600' }}>{element.title || 'Card title'}</Text>{sub ? <Text style={{ color: muted, fontSize: 9, marginTop: 3 }}>{sub}</Text> : null}{element.label ? <Text style={{ color: '#2F5D4E', fontSize: 9, fontWeight: '600', marginTop: 5 }}>{element.label}</Text> : null}{element.btn ? <Text style={{ color: ink, fontSize: 9, marginTop: 6 }}>▢ {element.btn}</Text> : null}</View>;
  }
  if (element.t === 'btn') return <View style={{ alignSelf: 'flex-start', marginHorizontal: 10, marginTop: 10, backgroundColor: ink, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: '#fff', fontSize: 9 }}>{element.label || 'Button'}</Text></View>;
  return <View style={{ marginTop: 5, marginHorizontal: 10, padding: 8, borderRadius: 8, backgroundColor: card, borderWidth: 1, borderColor: border }}><Text style={{ color: ink, fontSize: 10, fontWeight: '500' }}>{title}</Text>{sub ? <Text style={{ color: muted, fontSize: 9, marginTop: 3 }}>{sub}</Text> : null}</View>;
}

export function CustomerPagePreview({ payload, pageKey }: { payload: PageModel; pageKey: string }) {
  const page = payload?.pages?.[pageKey];
  if (!page) return <Text style={{ color: muted, fontSize: 11 }}>Select a page to preview its layout.</Text>;
  const order = (page.order || Object.keys(page.els || {})).filter((id) => page.els?.[id]);
  return (
    <View style={{ alignSelf: 'center', width: 262, maxWidth: '100%', borderWidth: 6, borderColor: '#252529', borderRadius: 26, overflow: 'hidden', backgroundColor: '#fff' }}>
      <View style={{ height: 17, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 60, height: 4, borderRadius: 4, backgroundColor: '#252529' }} /></View>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 15 }}>
        <View style={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8, borderBottomWidth: 1, borderColor: border }}>
          <Text style={{ color: muted, fontSize: 8 }}>CUSTOMER PAGE · DRAFT PREVIEW</Text>
          <Text style={{ color: ink, fontSize: 12, fontWeight: '600', marginTop: 3 }}>{page.title || pageKey}</Text>
        </View>
        {order.map((id) => <ElementView key={id} id={id} element={page.els![id]} page={page} />)}
      </ScrollView>
    </View>
  );
}
