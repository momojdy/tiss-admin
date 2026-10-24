import { ReactNode, useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { secLv, SCREEN_SECTION } from '../state/access';
import { useDb } from '../state/db';
import { useRequestAccess } from '../overlays/GrantDrawers';
import { Card } from '../ui/Card';
import { Txt } from '../ui/Txt';
import { OutlineBtn } from '../ui/Controls';
import { ScreenId, useNav } from './Nav';
import { OperationsScreen } from '../screens/operations/OperationsScreen';
import { EcosystemScreen } from '../screens/ecosystem/EcosystemScreen';
import { ServiceHubScreen } from '../screens/ecosystem/ServiceHubScreen';
import { FinanceScreen } from '../screens/finance/FinanceScreen';
import { PeopleScreen } from '../screens/people/PeopleScreen';

/** Screens ported so far. The rest show a clear "not ported yet" card (see README). */
const SCREENS: Partial<Record<ScreenId, () => ReactNode>> = {
  operations: () => <OperationsScreen />,
  ecosystem: () => <EcosystemScreen />,
  hub: () => <ServiceHubScreen />,
  finance: () => <FinanceScreen />,
  people: () => <PeopleScreen />,
};

function NoAccess({ sec }: { sec: number }) {
  const { go } = useNav();
  const request = useRequestAccess();
  return (
    <Card>
      <Txt size={14} weight={500}>No access</Txt>
      <Txt size={10.6} mut style={{ marginVertical: 6 }}>Your role does not include this section. You can ask a Super Admin for access to it for a period.</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <OutlineBtn primary onPress={() => request({ sec })}>Request access</OutlineBtn>
        <OutlineBtn onPress={() => go('overview')}>Go to Overview</OutlineBtn>
      </View>
    </Card>
  );
}
function NotPorted({ id }: { id: ScreenId }) {
  return (
    <Card>
      <Txt size={14} weight={500}>{id[0].toUpperCase() + id.slice(1)}</Txt>
      <Txt size={10.6} mut style={{ marginTop: 6 }}>This screen has not been ported to React Native yet. The HTML prototype (wantiss-admin-v9.html) remains the reference for it.</Txt>
    </Card>
  );
}

export function ScreenHost() {
  useDb();
  const { screen, navKey, keepScroll } = useNav();
  const ref = useRef<ScrollView>(null);
  useEffect(() => { if (!keepScroll) ref.current?.scrollTo({ y: 0, animated: false }); }, [navKey, keepScroll]);
  const allowed = SCREEN_SECTION[screen] === 0 || secLv(SCREEN_SECTION[screen]) > 0;
  const render = SCREENS[screen];
  return (
    <ScrollView ref={ref} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {!allowed ? <NoAccess sec={SCREEN_SECTION[screen]} /> : render ? render() : <NotPorted id={screen} />}
    </ScrollView>
  );
}
