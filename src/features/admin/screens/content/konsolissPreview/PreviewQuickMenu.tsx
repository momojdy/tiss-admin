import React from 'react';
import Menu,{type MenuProps} from './KonsolissQuickMenuView';
export type {KonsolissMenuAction} from './KonsolissQuickMenuView';
export default function PreviewQuickMenu(props:MenuProps){return <Menu {...props} inbox={{notifications:0,messages:0,notificationColor:'#BD279F',messageColor:'#BD279F',status:'ready',retry:()=>{}}}/>;}
