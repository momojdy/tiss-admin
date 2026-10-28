import { View } from 'react-native';
import { useNav } from './Nav';
import { useOverlay, DrawerBody } from '../ui/Overlay';
import { Card, CardTitle } from '../ui/Card';
import { OutlineBtn } from '../ui/Controls';
import { Txt } from '../ui/Txt';
import { AppIcon } from '../ui/AppIcon';

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const { go } = useNav();
  const { closeAll } = useOverlay();
  const open = (screen: string) => {
    closeAll();
    go(screen);
  };

  return (
    <DrawerBody title="Help & Support" onClose={onClose}>
      <Txt size={11.2} mut style={{ marginBottom: 12 }}>
        Choose the workspace that best matches what you need help with.
      </Txt>
      <Card>
        <CardTitle title="Review workflow" />
        <Txt size={10.5} mut style={{ marginBottom: 8 }}>
          Find applications awaiting review, check documents, and follow assignments.
        </Txt>
        <OutlineBtn onPress={() => open('operations')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="clipboard-list" size={14} />
            <Txt size={10.1}>Open review queue</Txt>
          </View>
        </OutlineBtn>
      </Card>
      <Card>
        <CardTitle title="Team & access" />
        <Txt size={10.5} mut style={{ marginBottom: 8 }}>
          Review staff accounts, access requests, permissions, and audit activity.
        </Txt>
        <OutlineBtn onPress={() => open('people')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="users" size={14} />
            <Txt size={10.1}>Open team workspace</Txt>
          </View>
        </OutlineBtn>
      </Card>
      <Card>
        <CardTitle title="Content drafts" />
        <Txt size={10.5} mut style={{ marginBottom: 8 }}>
          Find and edit content drafts. Saving a draft does not make a promotion live.
        </Txt>
        <OutlineBtn onPress={() => open('content')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="file-pen" size={14} />
            <Txt size={10.1}>Open content workspace</Txt>
          </View>
        </OutlineBtn>
      </Card>
    </DrawerBody>
  );
}
