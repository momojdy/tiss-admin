// Isolated phone-preview states; never subscribe to real inbox data.
import {useEffect,useState} from 'react';
import {usePreviewScenario} from './previewNative';
export function useUnreadSummary(){
 const scenario=usePreviewScenario(),[retried,setRetried]=useState(false);
 useEffect(()=>setRetried(false),[scenario]);
 return {status:scenario==='error'&&!retried?'unavailable':scenario==='loading'?'loading':'ready',notifications:0,messages:0,notificationColor:'#FD802E',messageColor:'#FD802E',retry:()=>setRetried(true)};
}
