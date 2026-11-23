import React from 'react';
import {View,StyleSheet,type ModalProps} from 'react-native';
/** Keep every customer popup inside the phone frame; never open an admin-wide modal. */
export function Modal({visible=true,children}:ModalProps){return visible?<View style={[StyleSheet.absoluteFill,{zIndex:1000}]}>{children}</View>:null;}
