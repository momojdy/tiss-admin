import { edit, needs, reqMessage, Req } from './access';
import { useToast } from '../ui/Toast';

/** What each kind of action needs (section edit level and/or a special right). */
export const REQ = {
  review: [edit(1)] as Req[],
  approve: [edit(1), needs('Approve submissions')] as Req[],
  refund: [edit(4), needs('Issue refunds')] as Req[],
  money: [edit(4)] as Req[],
  content: [edit(3)] as Req[],
  publish: [edit(3), needs('Publish content')] as Req[],
  contentApprove: [edit(3), needs('Approve submissions')] as Req[],
  ecosystem: [edit(2)] as Req[],
  ecosystemPublish: [edit(2), needs('Publish content')] as Req[],
  permissions: [needs('Manage permissions')] as Req[],
  settings: [needs('Manage settings')] as Req[],
  export: [needs('Export data')] as Req[],
  pause: [needs('Pause accounts')] as Req[],
  ban: [needs('Ban accounts')] as Req[],
};

/** Wrap an action: shows why it is not allowed instead of running it. */
export function useGuard() {
  const toast = useToast();
  return (reqs: Req[], fn: () => void) => () => {
    const m = reqMessage(reqs);
    if (m) toast(m); else fn();
  };
}
