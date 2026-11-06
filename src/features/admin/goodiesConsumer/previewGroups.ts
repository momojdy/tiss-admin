import {S,emit} from './store';
import {previewBackend} from './previewRuntime';
export const refreshUserAddresses=async()=>S.addr||[];
export const validateActiveGroup=async()=>true;
export const clearActiveGroup=()=>{S.groupOrder=null;emit();};
export const syncGroupOrderCartLine=async(_group:string,_line:any)=>({error:null});
export const removeGroupOrderCartLine=async(group:string,line:string)=>previewBackend.rpc('preview_remove_group_item',{group,line});

export const previewPaymentOptions=async()=>true;
