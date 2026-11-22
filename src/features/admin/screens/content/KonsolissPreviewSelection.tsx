import React, {createContext, useContext, type ReactNode} from 'react';
import {Pressable, View} from 'react-native';

const YELLOW='#FFD93D';
type SelectionState={selected:string|null;onSelect:(id:string)=>void;enabled:boolean};
export const KonsolissPreviewSelectionContext=createContext<SelectionState>({selected:null,onSelect:()=>{},enabled:false});

/** The same consumer content, with an overlay only in the editing preview. */
export function EditableKonsolissText({id,children}:{id?:string;children:ReactNode}){
 const ctx=useContext(KonsolissPreviewSelectionContext);
 if(!id||!ctx.enabled)return <>{children}</>;
 const active=ctx.selected===id;
 return <Pressable accessibilityRole="button" accessibilityLabel={'Edit '+id}
   onPress={(event)=>{event.stopPropagation();ctx.onSelect(id);}}
   style={{borderWidth:1.5,borderStyle:'dotted',borderColor:YELLOW,borderRadius:5,padding:1,backgroundColor:active?'rgba(255,217,61,0.12)':'transparent'}}>
   <View pointerEvents="none">{children}</View>
 </Pressable>;
}
