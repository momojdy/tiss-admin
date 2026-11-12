import type {SupabaseClient} from '@supabase/supabase-js';

/** Use the existing RLS-protected table so the legacy RPC's 500-row cap cannot hide assets. */
export async function listAllCmsAssets(client: Pick<SupabaseClient, 'from'>): Promise<any[]> {
  const rows: any[] = [];
  let cursor = '';
  while (true) {
    let query = client.from('wantiss_cms_assets').select('*').order('id', {ascending:true}).limit(200);
    if (cursor) query = query.gt('id', cursor);
    const {data, error} = await query;
    if (error) throw new Error(error.code === '42501' ? 'You do not have permission to view assets.' : 'Assets could not be fully loaded. Please retry.');
    const page = data || [];
    rows.push(...page);
    if (page.length < 200) break;
    const nextCursor = String(page[page.length - 1]?.id || '');
    if (!nextCursor || nextCursor === cursor) throw new Error('Assets could not be fully loaded. Please retry.');
    cursor = nextCursor;
  }
  return rows.sort((a,b)=>String(b.created_at || '').localeCompare(String(a.created_at || '')) || String(b.id).localeCompare(String(a.id)));
}
