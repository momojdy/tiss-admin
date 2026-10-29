import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DEFAULT_HOME_COPY, homeCategorySlug, type HomeCopy } from '../../lib/wantissHomeContent';

// Copy of the customer Home screen (tiss_tiss_beta: src/screens/Main/mainHomeScreen.tsx) at its 390 point design width.
// Drawn from the same content fields the app reads, so what is edited here is what the app shows once published.
const MAGENTA = '#BF008E';
const PINK_BG = '#FBE8EF';
const GOLD = '#DAAE67';
const LAVENDER = '#A789B1';
const INK = 'rgba(0,0,0,0.87)';
const NAV_MUTED = '#9A96A3';
const SELECT = '#FD802E';
const BASE = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';
const LOGO = BASE + 'WantisslogoOuterless.PNG';

const TABS = [
  { label: 'Favs', field: 'tab_favs', width: 60 }, { label: 'For you', field: 'tab_for_you', width: 65 }, { label: 'Flash', field: 'tab_flash', width: 70 },
  { label: 'Locals', field: 'tab_locals', width: 60 }, { label: 'New Arrivals', field: 'tab_new_arrivals', width: 80 }, { label: 'Live', field: 'tab_live', width: 70 },
];
const CATEGORIES: { label: string; file: string }[] = [
  { label: 'Goodies', file: 'Goodies.PNG' }, { label: 'Woulib', file: 'Woulib.PNG' }, { label: 'Services', file: 'Services.PNG' },
  { label: 'Globiz', file: 'Globiz.PNG' }, { label: 'Konsoliss', file: 'Konsoliss.PNG' }, { label: 'Stays', file: 'stays.PNG' },
];
const FEATURED_COLORS = ['#E8C7D8', '#D8B7E0', '#C9A8DE'];
const CARD_COLORS = ['#D8CFC0', '#C9CEDD', '#D9D9D9'];
const MASONRY = [[{ h: 190, c: '#FCEFD9' }, { h: 250, c: '#F6E4E8' }, { h: 200, c: '#F3F3F3' }], [{ h: 250, c: '#F6E4E8' }, { h: 190, c: '#FCEFD9' }, { h: 240, c: '#F6E4E8' }]];

const ICONS: Record<string, string> = {
  pin: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21zM12 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  tv: 'M4 6h16v11H4zM9 21h6M12 17v4M10 9.5v4l4-2z',
  message: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  cart: 'M3 4h2l2.5 11h10l2-8H7M9 20h.01M17 20h.01',
  smile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14a4 4 0 0 0 7 0M9 10h.01M15 10h.01',
  volume: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6',
  chevron: 'M9 6l6 6-6 6',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  bolt: 'M13 3L6 13h5l-1 8 7-10h-5z',
  close: 'M6 6l12 12M18 6L6 18',
};

function Icon({ name, size = 24, color = INK }: { name: keyof typeof ICONS; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={ICONS[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Home screen drawn from published-style content. In edit mode every element is tappable and rotating text stays still. */
export function HomePagePreview({ copy = DEFAULT_HOME_COPY, images = {}, editMode = false, selected = null, onSelect }: {
  copy?: HomeCopy;
  images?: Record<string, string>;
  editMode?: boolean;
  selected?: string | null;
  onSelect?: (target: string) => void;
}) {
  const [tab, setTab] = useState('For you');
  const [tickValue, setTick] = useState(0);
  const [popupOpen, setPopupOpen] = useState(true);
  useEffect(() => { if (editMode) return; const id = setInterval(() => setTick((v) => v + 1), 3000); return () => clearInterval(id); }, [editMode]);
  const tick = editMode ? 0 : tickValue;
  const colW = (390 - 16 - 12) / 2;
  const h = (key: string) => copy[key] || DEFAULT_HOME_COPY[key] || '';

  /** Makes an element tappable in edit mode and outlines it when selected. */
  const sel = (target: string, node: ReactNode, radius = 10) => {
    if (!editMode) return node;
    return (
      <Pressable onPress={() => onSelect?.(target)} accessibilityRole="button" accessibilityLabel={'Edit ' + target}>
        {node}
        {selected === target ? <View pointerEvents="none" style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderWidth: 2, borderStyle: 'dashed', borderColor: SELECT, borderRadius: radius }} /> : null}
      </Pressable>
    );
  };

  const category = (item: { label: string; file: string }) => {
    const slug = homeCategorySlug(item.label);
    const uri = images['cat_' + slug + '_asset_key'] || BASE + item.file;
    return (
      <View style={{ width: 78, height: 78, alignItems: 'center', paddingTop: 5 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden' }}>
          <Image source={{ uri }} style={{ width: 52, height: 52, borderRadius: 26 }} resizeMode="cover" />
        </View>
        <Text numberOfLines={1} style={{ marginTop: 5, fontSize: 11, fontWeight: '600', color: '#3A3A3A', textAlign: 'center', width: '100%' }}>{h('cat_' + slug) || item.label}</Text>
      </View>
    );
  };

  const teaser = (id: string, label: string, icon: 'sparkle' | 'clock', background: string, color: string, caption: string) => (
    <View style={{ flex: 1 }}>
      {sel(id, (
        <View style={{ flex: 1, height: 140, marginLeft: 8, marginRight: 4, marginVertical: 8, padding: 8, borderRadius: 12, backgroundColor: background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Icon name={icon} size={14} /><Text style={{ fontSize: 11, fontWeight: '600', marginLeft: 4, color: INK }}>{label}</Text></View>
          <View style={{ flex: 1, marginTop: 6, marginBottom: 4, borderRadius: 8, backgroundColor: color }} />
          <Text style={{ fontSize: 10, fontWeight: '500', color: INK }}>{caption}</Text>
        </View>
      ), 12)}
    </View>
  );

  const slogans = [h('slogan_1'), h('slogan_2'), h('slogan_3')];
  const notices = [h('notice_1'), h('notice_2'), h('notice_3')];
  const popupMessages = [h('popup_message_1'), h('popup_message_2'), h('popup_message_3')];
  const popupOn = h('popup_enabled') !== 'false';
  const newWords = h('tab_new_arrivals').split(' ');

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ height: 100, backgroundColor: PINK_BG, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ paddingLeft: 12, paddingBottom: 15, paddingRight: 8 }}><Icon name="pin" size={26} color={MAGENTA} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'flex-end', height: 100 }}>
          {TABS.map((item) => {
            const active = tab === item.label;
            const inner = item.label === 'Live' ? (
              <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'space-between' }}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: INK, alignSelf: 'flex-start' }}>{h('tab_live')}</Text>
                <View style={{ width: 45, height: 18, borderRadius: 4, backgroundColor: GOLD, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center' }}><Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M8 5v14l11-7z" fill="#fff" /></Svg></View>
              </View>
            ) : item.label === 'New Arrivals' ? (
              <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'space-between' }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: INK, alignSelf: 'flex-start' }}>{newWords[0]}</Text>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: INK, alignSelf: 'flex-end' }}>{newWords.slice(1).join(' ')}</Text>
              </View>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: INK }}>{h(item.field)}</Text>
                {item.label === 'Flash' ? <View style={{ marginLeft: 3, marginTop: 2 }}><Icon name="bolt" size={20} color={MAGENTA} /></View> : null}
              </View>
            );
            return (
              <Pressable key={item.label} onPress={() => (editMode ? onSelect?.(item.field) : setTab(item.label))} style={{ width: item.width, height: 50, marginRight: 8, borderTopLeftRadius: 30, borderTopRightRadius: 50, backgroundColor: active ? '#fff' : 'transparent' }}>
                {inner}
                {editMode && selected === item.field ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderStyle: 'dashed', borderColor: SELECT, borderTopLeftRadius: 30, borderTopRightRadius: 50 }} /> : null}
              </Pressable>
            );
          })}
          <View style={{ paddingLeft: 8, paddingBottom: 16 }}>{sel('categories_label', <Text style={{ fontSize: 16, fontWeight: '500', color: INK }}>{h('categories_label')}</Text>, 8)}</View>
          <View style={{ width: 12 }} />
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
        <View style={{ height: 47, borderRadius: 10, borderWidth: 1.75, borderColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingLeft: 2, paddingRight: 1.5, overflow: 'hidden' }}>
          <View style={{ paddingLeft: 3 }}><Icon name="scan" size={30} color={MAGENTA} /></View>
          <View style={{ paddingHorizontal: 5 }}><View style={{ width: 1.8, height: 30, backgroundColor: 'rgba(204,204,204,0.8)' }} /></View>
          <View style={{ width: 211.6, height: 47, justifyContent: 'center', paddingLeft: 3 }}>
            {sel('slogans', <Text numberOfLines={1} style={{ fontSize: 14, fontStyle: 'italic', color: '#000' }}>{slogans[tick % 3]}</Text>, 6)}
          </View>
          <View style={{ paddingTop: 4, paddingRight: 4 }}><Icon name="camera" size={25} color="rgba(136,136,142,0.635)" /></View>
          {sel('search_button', <View style={{ height: 30, width: 56, marginRight: 1.5, borderRadius: 8, backgroundColor: MAGENTA, alignItems: 'center', justifyContent: 'center' }}><Text numberOfLines={1} style={{ color: '#fff', fontSize: 12 }}>{h('search_button')}</Text></View>, 8)}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 105 }}>
        <View style={{ marginTop: 6, width: 390, height: 88, overflow: 'hidden' }}>
          {CATEGORIES.map((item, index) => (
            <View key={item.label} style={{ position: 'absolute', left: index * (390 / 5.59), top: 0 }}>
              {index < 5 ? sel('cat:' + homeCategorySlug(item.label), category(item), 12) : category(item)}
            </View>
          ))}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 78, height: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <View style={{ width: 14, height: 4, marginHorizontal: 2, borderRadius: 2, backgroundColor: MAGENTA }} />
            <View style={{ width: 6, height: 6, marginHorizontal: 2, borderRadius: 3, backgroundColor: '#E0E0E0' }} />
          </View>
        </View>

        <View style={{ height: 156, flexDirection: 'row' }}>
          {teaser('featured', h('featured_label'), 'sparkle', '#FBEAF0', FEATURED_COLORS[tick % 3], [h('featured_caption_1'), h('featured_caption_2'), h('featured_caption_3')][tick % 3])}
          {teaser('flash', h('flash_label'), 'clock', '#FCEFD9', '#E8C888', [h('flash_caption_1'), h('flash_caption_2'), h('flash_caption_3')][tick % 3])}
        </View>

        <View style={{ marginHorizontal: 6, marginTop: 6 }}>
          <View style={{ height: 150, padding: 10, paddingTop: 16, borderRadius: 16, backgroundColor: LAVENDER }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                {sel('voucher', (
                  <View style={{ height: 90, padding: 8, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: LAVENDER }}>{h('voucher_amount')}</Text>
                    <Text style={{ fontSize: 10, textAlign: 'center', marginTop: 2, color: INK }}>{h('voucher_text').replace(' ', '\n')}</Text>
                  </View>
                ))}
              </View>
              {[1, 2, 3].map((n, index) => {
                const image = images['banner_image_' + n + '_asset_key'];
                return (
                  <View key={n} style={{ flex: 1, marginRight: index < 2 ? 6 : 0 }}>
                    {sel('banner' + n, (
                      <View style={{ height: 90, borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden' }}>
                        {image ? <Image source={{ uri: image }} style={{ flex: 1 }} resizeMode="cover" /> : <View style={{ flex: 1, backgroundColor: CARD_COLORS[index] }} />}
                        <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 4, color: INK }}>{h('banner_caption_' + n)}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
            {sel('notice', (
              <View style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.12)', flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="volume" size={16} color="#fff" />
                <Text numberOfLines={1} style={{ flex: 1, marginLeft: 8, marginRight: 6, color: '#fff', fontSize: 12 }}>{notices[tick % 3]}</Text>
                <Icon name="chevron" size={16} color="#fff" />
              </View>
            ), 8)}
          </View>
        </View>

        <View style={{ paddingHorizontal: 8, paddingTop: 8, flexDirection: 'row' }}>
          {MASONRY.map((column, ci) => (
            <View key={ci} style={{ width: colW, marginRight: ci === 0 ? 12 : 0 }}>
              {column.map((card, k) => <View key={k} style={{ height: card.h, backgroundColor: card.c, borderRadius: 12, marginBottom: 12 }} />)}
            </View>
          ))}
        </View>
      </ScrollView>

      {(popupOn && popupOpen) || editMode ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, right: 23, bottom: 102, height: 40, opacity: popupOn ? 1 : 0.4 }}>
          {sel('popup', (
            <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 30, backgroundColor: PINK_BG, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: MAGENTA }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{h('popup_badge')}</Text></View>
              <Text numberOfLines={1} style={{ flex: 1, marginLeft: 8, color: LAVENDER, fontSize: 12, fontWeight: '500' }}>{popupMessages[tick % 3]}</Text>
              <Pressable onPress={() => setPopupOpen(false)} disabled={editMode} style={{ marginLeft: 8 }} hitSlop={10}><Icon name="close" size={16} color={MAGENTA} /></Pressable>
            </View>
          ), 30)}
        </View>
      ) : null}

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 14 }}>
        <View style={{ height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
          <View style={{ flex: 1, height: 60, alignItems: 'center' }}>
            {sel('nav_logo', (
              <View style={{ marginTop: 2, width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8CFE0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Image source={{ uri: images.logo_asset_key || LOGO }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" />
              </View>
            ), 28)}
          </View>
          {([['tv', 'nav_showcase'], ['message', 'nav_messages'], ['cart', 'nav_cart'], ['smile', 'nav_me']] as const).map(([icon, field]) => (
            <View key={field} style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'flex-end' }}>
              {sel(field, (
                <View style={{ alignItems: 'center' }}>
                  <Icon name={icon} size={25} color={NAV_MUTED} />
                  <Text numberOfLines={1} style={{ paddingTop: 4, fontSize: 10.5, color: '#1F1E1E', textAlign: 'center' }}>{h(field)}</Text>
                </View>
              ), 8)}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
