// Editor-only fixtures. Customer code loads purchasable builders from Supabase.
import {TEMPLATES} from './previewBuilderTemplates';
import {bClean,type Builder} from './builders/engine';
export function fromTemplate(type:'pizza'|'burger'|'custom'):Builder{
 const template=TEMPLATES[type];
 return bClean({id:'preview-'+type,type,name:template.name,desc:template.desc,emoji:template.emoji,base:template.base,notes:true,
  sizes:template.sizes.map((size,index)=>({...size,id:'preview-size-'+index,avail:true})),
  groups:template.groups.map((group,index)=>({...group,id:'preview-group-'+index,items:group.items.map((item,itemIndex)=>({...item,id:'preview-item-'+index+'-'+itemIndex,avail:true}))})),
 })!;
}
