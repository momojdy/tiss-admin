import {Modal} from '../previewNative';
import {EditableNativeText as Text} from '../EditableNativeText';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal as UnusedNativeModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as UnusedNativeText,
  View,
} from 'react-native';
import { useFonts, Manrope_600SemiBold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { previewBackend as supabase } from '../previewRuntime';

const OLIVE = '#1A2517';
const SAGE = '#ACC8A2';
const SAGE_DARK = '#8FAF84';

const SYMBOLS: Record<string, string> = { USD: '$', HTG: 'HTG', DOP: 'RD$' };

const ITEM_HEIGHT = 48;

const ARROW_DOWN =
  'M8.12 9.29 12 13.17l3.88-3.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-4.59 4.59c-.39.39-1.02.39-1.41 0L6.7 10.7c-.39-.39-.39-1.02 0-1.41.39-.38 1.03-.39 1.42 0z';
const INFO_OUTLINE =
  'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z';

function MaterialIcon({ d, size, opacity = 1 }: { d: string; size: number; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d={d} fill={SAGE} />
    </Svg>
  );
}

function WalletEye({ open }: { open: boolean }) {
  const p = {
    stroke: SAGE,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      {open ? (
        <>
          <Path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12" {...p} />
          <Circle cx={12} cy={12} r={3} {...p} />
        </>
      ) : (
        <>
          <Path d="M3 3L21 21" {...p} />
          <Path d="M10.6 10.6C10.1 11 9.8 11.5 9.8 12C9.8 13.7 11.1 15 12.7 15C13.5 15 14.3 14.7 14.8 14.1" {...p} />
          <Path d="M6.5 6.7C4 8.3 2 12 2 12C2 12 6 19 13 19C14.9 19 16.6 18.5 18.1 17.7" {...p} />
          <Path d="M17.6 17.6C19.9 16 22 12 22 12C22 12 20.6 9.5 18.1 7.6" {...p} />
        </>
      )}
    </Svg>
  );
}

function CurrencyDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (currency: string) => void;
}) {
  const buttonRef = useRef<React.ElementRef<typeof View>>(null);
  const [menu, setMenu] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const openMenu = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const screenHeight = Dimensions.get('window').height;
      const maxHeight = screenHeight - 16;
      const menuHeight = Math.min(options.length * ITEM_HEIGHT, maxHeight);
      const index = Math.max(0, options.indexOf(value));

      let top = y + height / 2 - (index * ITEM_HEIGHT + ITEM_HEIGHT / 2);
      top = Math.max(8, Math.min(top, screenHeight - menuHeight - 8));

      setMenu({
        top,
        left: x - 16,
        width: width + 32,
        maxHeight,
      });
    });
  };

  return (
    <View style={styles.pill}>
      <View ref={buttonRef} collapsable={false}>
        <Pressable onPress={openMenu} style={styles.pillButton}>
          <Text style={styles.pillText}>{value}</Text>
          <MaterialIcon d={ARROW_DOWN} size={16} />
        </Pressable>
      </View>

      <Modal
        visible={!!menu}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => setMenu(null)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
        {menu && (
          <View
            style={[
              styles.menu,
              {
                top: menu.top,
                left: menu.left,
                width: menu.width,
                maxHeight: menu.maxHeight,
              },
            ]}
          >
            <ScrollView bounces={false}>
              {options.map(currency => (
                <Pressable
                  key={currency}
                  onPress={() => {
                    onChange(currency);
                    setMenu(null);
                  }}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuText}>{currency}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

export default function WalletBalance({ height = 170, contentLabel = (_id: string, fallback: string) => fallback }: { height?: number; contentLabel?: (id: string, fallback: string) => string }) {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const walletText = contentLabel;
  const [errorMessage, setErrorMessage] = useState<'signIn'|'missing'|'loadFailed'|null>(null);
  const walletErrors = {
    signIn:walletText('lbl.wallet.signIn','Sign in to view your wallet.'),
    missing:walletText('lbl.wallet.missing','No wallet found for this account.'),
    loadFailed:walletText('lbl.wallet.loadFailed','Could not load wallet. Tap to retry.'),
  };
  const [wantissNumber, setWantissNumber] = useState<string | null>(null);
  const [usdBalance, setUsdBalance] = useState(0);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });

  const mounted = useRef(false);
  const isFetching = useRef(false);
  const [manropeSemiLoaded] = useFonts({ Manrope_600SemiBold });
  const [manropeExtraLoaded] = useFonts({ Manrope_800ExtraBold });

  const loadWalletData = useCallback(async (showLoading = true) => {
    if (!mounted.current || isFetching.current) return;
    isFetching.current = true;

    if (showLoading) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        if (!mounted.current) return;
        setIsLoading(false);
        setErrorMessage('signIn');
        return;
      }

      const { data: walletRow, error: walletErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (walletErr) throw walletErr;

      if (!walletRow) {
        if (!mounted.current) return;
        setIsLoading(false);
        setErrorMessage('missing');
        return;
      }

      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('wantiss_number')
        .eq('id', user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;

      const { data: rateRows, error: rateErr } = await supabase
        .from('exchange_rates')
        .select('to_currency, market_rate, created_at, expires_at')
        .eq('from_currency', 'USD')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });
      if (rateErr) throw rateErr;

      const fetchedRates: Record<string, number> = { USD: 1 };
      for (const row of rateRows ?? []) {
        const currency = row.to_currency;
        const marketRate = Number(row.market_rate);

        if (
          typeof currency === 'string' &&
          Number.isFinite(marketRate) &&
          marketRate > 0 &&
          fetchedRates[currency] === undefined
        ) {
          fetchedRates[currency] = marketRate;
        }
      }

      const rawBalance = walletRow.balance;
      const balanceValue = typeof rawBalance === 'string' ? Number(rawBalance) : rawBalance;
      if (typeof balanceValue !== 'number' || !Number.isFinite(balanceValue)) {
        throw new Error('Wallet balance is not numeric.');
      }

      if (!mounted.current) return;

      setUsdBalance(balanceValue);
      setWantissNumber(
        typeof profileRow?.wantiss_number === 'string'
          ? profileRow.wantiss_number
          : null,
      );
      setRates(fetchedRates);
      setSelectedCurrency(current => (fetchedRates[current] ? current : 'USD'));
      setIsLoading(false);
      setErrorMessage(null);
    } catch (error) {
      console.warn('WalletBalance error:', error);
      if (!mounted.current) return;
      setIsLoading(false);
      setErrorMessage('loadFailed');
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    loadWalletData();

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (!userId || cancelled) return;

        channel = supabase
          .channel(`wallet-balance-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wallets',
              filter: `user_id=eq.${userId}`,
            },
            () => loadWalletData(false),
          )
          .subscribe();
      } catch (error) {
        console.warn('WalletBalance realtime error:', error);
      }
    })();

    return () => {
      mounted.current = false;
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadWalletData]);

  const currencies = useMemo(
    () =>
      Object.keys(rates).sort((a, b) =>
        a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b),
      ),
    [rates],
  );

  const activeCurrency = currencies.includes(selectedCurrency) ? selectedCurrency : 'USD';
  const displayedBalance = usdBalance * (rates[activeCurrency] ?? 1);
  const formattedBalance = displayedBalance.toFixed(2);
  const symbol = SYMBOLS[activeCurrency];
  const formattedWithSymbol = symbol
    ? `${symbol}${formattedBalance}`
    : `${formattedBalance} ${activeCurrency}`;

  const digits = wantissNumber?.replace(/\\D/g, '');
  const masked =
    !digits || digits.length < 4
      ? '•••• •••• •••• ••••'
      : `•••• •••• •••• ${digits.slice(-4)}`;

  const balanceText = isLoading
    ? '···'
    : errorMessage
      ? '—'
      : showBalance
        ? formattedWithSymbol
        : '••••••';

  return (
    <Pressable
      disabled={!errorMessage}
      onPress={() => loadWalletData()}
      style={[styles.card, { height }]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <View style={styles.centerRow}>
            <Text cmsKey={'lbl.wallet.title'}
              style={[styles.label, manropeSemiLoaded && styles.manropeSemi]}
              numberOfLines={1}
              ellipsizeMode="clip"
              allowFontScaling={false}
            >
              {walletText('lbl.wallet.title','Wantiss Crédité')}
            </Text>
            <Pressable
              hitSlop={6}
              onPress={() => setShowBalance(value => !value)}
              style={styles.eye}
            >
              <WalletEye open={showBalance} />
            </Pressable>
          </View>

          <View style={[styles.centerRow, { marginTop: 16 }]}>
            <View style={styles.balanceWrap}>
              <Text style={[styles.balance, manropeExtraLoaded && styles.manropeExtra]}>
                {balanceText}
              </Text>
            </View>

            {!errorMessage && currencies.length > 0 && (
              <View style={styles.currencyWrap}>
                <CurrencyDropdown
                  value={activeCurrency}
                  options={currencies}
                  onChange={setSelectedCurrency}
                />
              </View>
            )}
          </View>
        </View>

        <LinearGradient
          colors={[SAGE, SAGE_DARK]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.chip}
        >
          <View style={styles.chipInner} />
        </LinearGradient>
      </View>

      <View style={styles.bottomRow}>
        {errorMessage ? (
          <View style={styles.centerRow}>
            <MaterialIcon d={INFO_OUTLINE} size={13} opacity={0.8} />
            <Text style={styles.error}>{walletErrors[errorMessage]}</Text>
          </View>
        ) : (
          <View style={[styles.centerRow, styles.footerRow]}>
            <Text style={styles.footer}>{masked}</Text>
            <Text style={styles.footer}>WANTISS</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 15,
    marginTop: 13,
    backgroundColor: OLIVE,
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: SAGE,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Manrope_600SemiBold',
    flexShrink: 0,
    includeFontPadding: false,
    paddingRight: 1,
  },
  manropeSemi: {
    fontFamily: 'Manrope_600SemiBold',
  },
  manropeExtra: {
    fontFamily: 'Manrope_800ExtraBold',
  },
  eye: {
    width: 15,
    height: 15,
    marginLeft: 9,
    opacity: 0.85,
  },
  balanceWrap: {
    flexShrink: 1,
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 41,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_800ExtraBold',
    includeFontPadding: false,
  },
  currencyWrap: {
    marginLeft: 8,
    flexShrink: 0,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(172, 200, 162, 0.18)',
  },
  pillButton: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  menu: {
    position: 'absolute',
    backgroundColor: OLIVE,
    borderRadius: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  menuItem: {
    height: ITEM_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  chip: {
    width: 34,
    height: 26,
    borderRadius: 6,
    padding: 5,
  },
  chipInner: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(26, 37, 23, 0.12)',
  },
  bottomRow: {
    marginTop: 18,
    paddingTop: 8,
  },
  footerRow: {
    justifyContent: 'space-between',
  },
  footer: {
    color: SAGE,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    fontFamily: 'Manrope_600SemiBold',
  },
  error: {
    flex: 1,
    marginLeft: 5,
    color: SAGE,
    opacity: 0.85,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Manrope_600SemiBold',
  },
});
