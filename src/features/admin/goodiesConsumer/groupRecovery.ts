/** Resume an existing hosted group without trusting device-local membership. */
export type OpenHostedGoodiesGroup={
  id:string;code:string;storeId:string;expiresAt:string;
};
export async function fetchOpenHostedGoodiesGroup(client:any,accountId:string,now=Date.now()):Promise<OpenHostedGoodiesGroup|null>{
  if(!accountId)throw new Error('Sign in required');
  const {data:auth,error:authError}=await client.auth.getUser();
  if(authError||auth?.user?.id!==accountId)throw new Error('Group account unavailable');
  // PostgreSQL RLS still requires membership. The host-specific predicate
  // prevents restoring a different member's or another account's group.
  const {data,error}=await client.from('goodies_group_orders')
    .select('id,invite_code,store_id,expires_at')
    .eq('host_user_id',accountId).eq('status','open')
    .gt('expires_at',new Date(now).toISOString())
    .order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw new Error('Could not check hosted group');
  if(!data)return null;
  if(typeof data.id!=='string'||!/^[-0-9a-f]{36}$/i.test(data.id)
    ||typeof data.invite_code!=='string'||! /^[A-Z0-9]{8,16}$/.test(data.invite_code)
    ||typeof data.store_id!=='string'||!data.store_id.trim()
    ||typeof data.expires_at!=='string'||!Number.isFinite(Date.parse(data.expires_at))
    ||Date.parse(data.expires_at)<=now)throw new Error('Hosted group unavailable');
  return {id:data.id,code:data.invite_code,storeId:data.store_id,expiresAt:data.expires_at};
}
