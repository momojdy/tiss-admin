import { ReactNode } from 'react';
import { View } from 'react-native';
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
import { ContentScreen } from '../screens/content/ContentScreen';
import { OverviewScreen } from '../screens/overview/OverviewScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { GoodiesAdminScreen } from '../screens/goodies/GoodiesAdminScreen';
import { ServiceWorkspaceScreen } from '../screens/workspace/ServiceWorkspaceScreen';
import { CustomerPageEditorScreen } from '../screens/content/CustomerPageEditorScreen';
import { BusinessDetailsScreen } from '../screens/ecosystem/BusinessDetailsScreen';
import { PotssyAdminScreen } from '../screens/potssy/PotssyAdminScreen';
import { BrandingScreen } from '../screens/content/BrandingScreen';

/** Unported screens render a placeholder until implemented. */
const SCREENS: Partial<Record<ScreenId, () => ReactNode>> = {
  overview: () => <OverviewScreen />,
  analytics: () => <AnalyticsScreen />,
  goodies: () => <GoodiesAdminScreen />,
  workspace: () => <ServiceWorkspaceScreen />,
  operations: () => <OperationsScreen />,
  ecosystem: () => <EcosystemScreen />,
  hub: () => <ServiceHubScreen />,
  finance: () => <FinanceScreen />,
  people: () => <PeopleScreen />,
  content: () => <ContentScreen />,
  editor: () => <CustomerPageEditorScreen />,
  business: () => <BusinessDetailsScreen />,
  potssy: () => <PotssyAdminScreen />,
  branding: () => <BrandingScreen />,
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
      <Txt size={10.6} mut style={{ marginTop: 6 }}>This screen is coming soon.</Txt>
    </Card>
  );
}

export function ScreenHost() {
  useDb();
  const { screen } = useNav();
  const allowed = secLv(SCREEN_SECTION[screen]) > 0;
  const render = SCREENS[screen];
  return <View>{!allowed ? <NoAccess sec={SCREEN_SECTION[screen]} /> : render ? render() : <NotPorted id={screen} />}</View>;
}
