import React from 'react';
import {TextInput, View} from 'react-native';
import {Section} from '../../ui/Card';
import {Txt} from '../../ui/Txt';
import {OutlineBtn} from '../../ui/Controls';
import {useTheme} from '../../theme/ThemeContext';
import {moveContentEntry, setLocalizedText} from '../../goodiesConsumer/contentEditing';

type Props = {draft: any; locale: string; disabled: boolean; edit: (change: (draft: any) => void) => void};
/** Existing v5 fields only. Financial controls and business/account records stay outside this editor. */
export function GoodiesPageContentFields({draft, locale, disabled, edit}: Props) {
  const {c} = useTheme();
  const style = {color:c.ink, backgroundColor:c.card, borderColor:c.bd, borderWidth:1, borderRadius:10, padding:9, marginTop:6, fontSize:11};
  const read = (value:any) => typeof value==='string' ? (locale==='en'?value:'') : String(value?.[locale]?.v || '');
  const field = (entry:any, key:string, label:string, update:(value:any)=>void) => <View key={key} style={{marginTop:7}}>
    <Txt size={10} mut>{label}</Txt>
    <TextInput value={read(entry[key])} onChangeText={text=>update(setLocalizedText(entry[key],locale,text))} multiline editable={!disabled} style={style}/>
    <OutlineBtn disabled={disabled || !read(entry[key]).trim()} onPress={()=>update({...setLocalizedText(entry[key],locale,read(entry[key])),[locale]:{v:read(entry[key]),s:entry[key]?.[locale]?.s==='reviewed'?'draft':'reviewed'}})}>{entry[key]?.[locale]?.s==='reviewed'?'Reviewed':'Mark reviewed'}</OutlineBtn>
  </View>;
  const lists = [
    {key:'faq',title:'Help · FAQ content',fields:[['q','Question'],['a','Answer']],create:()=>({q:{},a:{}})},
    {key:'topics',title:'Contact · Support topics',fields:[['t','Topic']],create:()=>({id:'topic.'+Date.now(),t:{}})},
    {key:'legal',title:'Policies · Approved documents',fields:[['t','Policy body']],create:()=>({id:'legal.'+Date.now(),st:'Hidden',t:{}})},
  ];
  return <>
    {lists.map(list=><Section key={list.key} title={list.title}>
      <Txt size={10} mut>{locale.toUpperCase()} · Changes use the existing draft/save/publish flow. Mark reviewed only after human review.</Txt>
      {(draft[list.key]||[]).map((entry:any,index:number)=><View key={entry.id||index} style={{paddingVertical:8,borderTopWidth:1,borderTopColor:c.bd}}>
        {list.key==='legal'?<><Txt size={10}>Policy key (legal.terms, legal.privacy, legal.refund)</Txt><TextInput value={entry.id||''} editable={!disabled} onChangeText={id=>edit(next=>{next.legal[index].id=id;})} style={style}/><OutlineBtn disabled={disabled} onPress={()=>edit(next=>{next.legal[index].st=entry.st==='Live'?'Hidden':'Live';})}>{entry.st==='Live'?'Live':'Hidden'}</OutlineBtn></>:null}
        {list.fields.map(([key,label])=>field(entry,key,label,value=>edit(next=>{next[list.key][index][key]=value;})))}
        <View style={{flexDirection:'row',gap:6,marginTop:7}}>
          <OutlineBtn disabled={disabled||index===0} onPress={()=>edit(next=>{next[list.key]=moveContentEntry(next[list.key],index,-1);})}>Move up</OutlineBtn>
          <OutlineBtn disabled={disabled||index===(draft[list.key]||[]).length-1} onPress={()=>edit(next=>{next[list.key]=moveContentEntry(next[list.key],index,1);})}>Move down</OutlineBtn>
          <OutlineBtn disabled={disabled} onPress={()=>edit(next=>{next[list.key].splice(index,1);})}>Remove</OutlineBtn>
        </View>
      </View>)}
      <OutlineBtn disabled={disabled} onPress={()=>edit(next=>{next[list.key]=[...(next[list.key]||[]),list.create()];})}>Add {list.key==='faq'?'FAQ':list.key==='topics'?'support topic':'policy'}</OutlineBtn>
    </Section>)}
    <Section title="Promotions · Existing coupon wording">
      <Txt size={10} mut>Edit customer wording only. Codes, eligibility, discount values and financial rules remain in their existing authorized controls.</Txt>
      {(draft.coupons || []).map((entry:any,index:number)=><View key={entry.id||entry.code||index} style={{marginTop:8}}>
        <Txt size={10.5}>{entry.code||entry.id}</Txt>
        {field(entry,'title','Offer title',value=>edit(next=>{next.coupons[index].title=value;}))}
        {field(entry,'desc','Offer description',value=>edit(next=>{next.coupons[index].desc=value;}))}
      </View>)}
      {!draft.coupons?.length?<Txt size={10} mut>No coupon wording is configured.</Txt>:null}
    </Section>
    <Section title="Shared · Existing restriction messages">
      <Txt size={10} mut>Edits change wording only. Eligibility, financial rules and platform restrictions remain server controlled.</Txt>
      {(draft.rg?.texts||[]).map((entry:any,index:number)=><View key={entry.id}>{field(entry,'t',entry.id,value=>edit(next=>{next.rg.texts[index].t=value;}))}</View>)}
      {!draft.rg?.texts?.length?<Txt size={10} mut>No custom restriction messages are configured. The application defaults remain active.</Txt>:null}
    </Section>
  </>;
}
