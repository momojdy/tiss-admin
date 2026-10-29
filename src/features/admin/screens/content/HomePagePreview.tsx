import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Static copy of the customer Home screen (tiss_tiss_beta: src/screens/Main/mainHomeScreen.tsx) at its 390 point design width.
const MAGENTA = '#BF008E';
const PINK_BG = '#FBE8EF';
const GOLD = '#DAAE67';
const LAVENDER = '#A789B1';
const INK = 'rgba(0,0,0,0.87)';
const NAV_MUTED = '#9A96A3';
const BASE = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';
const LOGO = BASE + 'WantisslogoOuterless.PNG';

const TABS = [{ label: 'Favs', width: 60 }, { label: 'For you', width: 65 }, { label: 'Flash', width: 70 }, { label: 'Locals', width: 60 }, { label: 'New Arrivals', width: 80 }, { label: 'Live', width: 70 }];
const SLOGANS = ['Buy Happiness', 'Wantiss', 'Sell Joy'];
const CATEGORIES: { label: string; file: string }[] = [
  { label: 'Goodies', file: 'Goodies.PNG' }, { label: 'Woulib', file: 'Woulib.PNG' }, { label: 'Services', file: 'Services.PNG' },
  { label: 'Globiz', file: 'Globiz.PNG' }, { label: 'Konsoliss', file: 'Konsoliss.PNG' }, { label: 'Stays', file: 'stays.PNG' },
];
const FEATURED = [['#E8C7D8', 'from $9'], ['#D8B7E0', 'from $15'], ['#C9A8DE', 'from $6']];
const CARD_COLORS = ['#D8CFC0', '#C9CEDD', '#D9D9D9'];
const CARD_CAPTIONS = ['$51.9 off', '$10.5 off', '$43.9 off'];
const NOTIFICATIONS = ['new season styles, up to 20% off', 'free shipping on orders over $50', 'limited time: buy 1 get 1 half off'];
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

function Category({ label, file }: { label: string; file: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ width: 78, height: 78, alignItems: 'center', paddingTop: 5 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: failed ? '#F1F1F2' : 'transparent' }}>
        {failed ? <Text style={{ fontSize: 18, color: INK }}>{label[0]}</Text> : <Image source={{ uri: BASE + file }} style={{ width: 52, height: 52, borderRadius: 26 }} resizeMode="cover" onError={() => setFailed(true)} />}
      </View>
      <Text numberOfLines={1} style={{ marginTop: 5, fontSize: 11, fontWeight: '600', color: '#3A3A3A', textAlign: 'center', width: '100%' }}>{label}</Text>
    </View>
  );
}

function TeaserCard({ label, icon, background, color, caption }: { label: string; icon: 'sparkle' | 'clock'; background: string; color: string; caption: string }) {
  return (
    <View style={{ flex: 1, marginLeft: 8, marginRight: 4, marginVertical: 8, padding: 8, borderRadius: 12, backgroundColor: background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Icon name={icon} size={14} /><Text style={{ fontSize: 11, fontWeight: '600', marginLeft: 4, color: INK }}>{label}</Text></View>
      <View style={{ flex: 1, marginTop: 6, marginBottom: 4, borderRadius: 8, backgroundColor: color }} />
      <Text style={{ fontSize: 10, fontWeight: '500', color: INK }}>{caption}</Text>
    </View>
  );
}

/** Home screen shown after "signing in" inside the phone preview. */
export function HomePagePreview() {
  const [tab, setTab] = useState('For you');
  const [tick, setTick] = useState(0);
  const [popup, setPopup] = useState(true);
  useEffect(() => { const id = setInterval(() => setTick((v) => v + 1), 3000); return () => clearInterval(id); }, []);
  const colW = (390 - 16 - 12) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ height: 100, backgroundColor: PINK_BG, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ paddingLeft: 12, paddingBottom: 15, paddingRight: 8 }}><Icon name="pin" size={26} color={MAGENTA} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'flex-end', height: 100 }}>
          {TABS.map((item) => {
            const active = tab === item.label;
            return (
              <Pressable key={item.label} onPress={() => setTab(item.label)} style={{ width: item.width, height: 50, marginRight: 8, borderTopLeftRadius: 30, borderTopRightRadius: 50, backgroundColor: active ? '#fff' : 'transparent' }}>
                {item.label === 'Live' ? (
                  <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: INK, alignSelf: 'flex-start' }}>Live</Text>
                    <View style={{ width: 45, height: 18, borderRadius: 4, backgroundColor: GOLD, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center' }}><Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M8 5v14l11-7z" fill="#fff" /></Svg></View>
                  </View>
                ) : item.label === 'New Arrivals' ? (
                  <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 6, justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: INK, alignSelf: 'flex-start' }}>New</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: INK, alignSelf: 'flex-end' }}>Arrivals</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: INK }}>{item.label}</Text>
                    {item.label === 'Flash' ? <View style={{ marginLeft: 3, marginTop: 2 }}><Icon name="bolt" size={20} color={MAGENTA} /></View> : null}
                  </View>
                )}
              </Pressable>
            );
          })}
          <View style={{ paddingLeft: 8, paddingBottom: 16 }}><Text style={{ fontSize: 16, fontWeight: '500', color: INK }}>Categories...</Text></View>
          <View style={{ width: 12 }} />
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
        <View style={{ height: 47, borderRadius: 10, borderWidth: 1.75, borderColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingLeft: 2, paddingRight: 1.5, overflow: 'hidden' }}>
          <View style={{ paddingLeft: 3 }}><Icon name="scan" size={30} color={MAGENTA} /></View>
          <View style={{ paddingHorizontal: 5 }}><View style={{ width: 1.8, height: 30, backgroundColor: 'rgba(204,204,204,0.8)' }} /></View>
          <View style={{ width: 211.6, height: 47, justifyContent: 'center', paddingLeft: 3 }}><Text numberOfLines={1} style={{ fontSize: 14, fontStyle: 'italic', color: '#000' }}>{SLOGANS[tick % 3]}</Text></View>
          <View style={{ paddingTop: 4, paddingRight: 4 }}><Icon name="camera" size={25} color="rgba(136,136,142,0.635)" /></View>
          <View style={{ height: 30, width: 56, marginRight: 1.5, borderRadius: 8, backgroundColor: MAGENTA, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 12 }}>search</Text></View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 105 }}>
        <View style={{ marginTop: 6, width: 390, height: 88, overflow: 'hidden' }}>
          {CATEGORIES.map((item, index) => <View key={item.label} style={{ position: 'absolute', left: index * (390 / 5.59), top: 0 }}><Category label={item.label} file={item.file} /></View>)}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 78, height: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <View style={{ width: 14, height: 4, marginHorizontal: 2, borderRadius: 2, backgroundColor: MAGENTA }} />
            <View style={{ width: 6, height: 6, marginHorizontal: 2, borderRadius: 3, backgroundColor: '#E0E0E0' }} />
          </View>
        </View>

        <View style={{ height: 156, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}><TeaserCard label="featured picks" icon="sparkle" background="#FBEAF0" color={FEATURED[tick % 3][0]} caption={FEATURED[tick % 3][1]} /></View>
          <View style={{ flex: 1 }}><TeaserCard label="flash deals" icon="clock" background="#FCEFD9" color="#E8C888" caption="up to $20 off" /></View>
        </View>

        <View style={{ marginHorizontal: 6, marginTop: 6 }}>
          <View style={{ height: 150, padding: 10, paddingTop: 16, borderRadius: 16, backgroundColor: LAVENDER }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, height: 90, padding: 8, marginRight: 6, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: LAVENDER }}>$7</Text>
                <Text style={{ fontSize: 10, textAlign: 'center', marginTop: 2, color: INK }}>{'grocery\nvoucher'}</Text>
              </View>
              {CARD_CAPTIONS.map((caption, index) => (
                <View key={caption} style={{ flex: 1, height: 90, marginRight: index < 2 ? 6 : 0, borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden' }}>
                  <View style={{ flex: 1, backgroundColor: CARD_COLORS[index] }} />
                  <Text style={{ fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 4, color: INK }}>{caption}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.12)', flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="volume" size={16} color="#fff" />
              <Text numberOfLines={1} style={{ flex: 1, marginLeft: 8, marginRight: 6, color: '#fff', fontSize: 12 }}>{NOTIFICATIONS[tick % 3]}</Text>
              <Icon name="chevron" size={16} color="#fff" />
            </View>
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

      {popup ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, right: 23, bottom: 102, height: 40 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 30, backgroundColor: PINK_BG, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: MAGENTA }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>promo</Text></View>
            <Text numberOfLines={1} style={{ flex: 1, marginLeft: 8, color: LAVENDER, fontSize: 12, fontWeight: '500' }}>{['spend $80, save $10 — claim now', 'free delivery on your next order', 'new members get 15% off today'][tick % 3]}</Text>
            <Pressable onPress={() => setPopup(false)} style={{ marginLeft: 8 }} hitSlop={10}><Icon name="close" size={16} color={MAGENTA} /></Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 14 }}>
        <View style={{ height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
          <View style={{ flex: 1, height: 60, alignItems: 'center' }}>
            <View style={{ marginTop: 2, width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8CFE0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Image source={{ uri: LOGO }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="contain" />
            </View>
          </View>
          {([['tv', 'Showcase'], ['message', 'Messages'], ['cart', 'Cart'], ['smile', 'Me']] as const).map(([icon, label]) => (
            <View key={label} style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Icon name={icon} size={25} color={NAV_MUTED} />
              <Text style={{ paddingTop: 4, fontSize: 10.5, color: '#1F1E1E', textAlign: 'center' }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
