import {label as cmsText} from "../content";
import React, {useEffect, useRef, useState} from 'react';
import {Modal, View, Pressable, KeyboardAvoidingView, Platform, Keyboard, Animated} from 'react-native';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | `${number}%`;
  keyboardAware?: boolean;
};

export function BottomSheet({visible, onClose, children, maxHeight = '90%', keyboardAware = false}: BottomSheetProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (!keyboardAware) return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, [keyboardAware]);
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: keyboardAware && keyboardVisible ? 'flex-start' : 'flex-end', paddingTop: keyboardAware && keyboardVisible ? 28 : 0}}>
          <Pressable accessibilityRole="button" accessibilityLabel={cmsText("lbl.page.components.Overlays.d39e50fecb", "Close sheet")} onPress={onClose} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} />
          <View style={{width: '100%', maxHeight: keyboardAware && keyboardVisible ? '68%' : maxHeight, flexShrink: 1, minHeight: 0}}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmDialogProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
};

export function ConfirmDialog({visible, onClose, children, accessibilityLabel = cmsText("lbl.page.components.Overlays.d2252166e4", "Close confirmation")}: ConfirmDialogProps) {
  const scale = useRef(new Animated.Value(0.96)).current;
  useEffect(() => {
    if (visible) Animated.spring(scale, {toValue: 1, useNativeDriver: true, speed: 22, bounciness: 4}).start();
    else scale.setValue(0.96);
  }, [visible, scale]);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 24}}>
        <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onClose} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} />
        <Animated.View accessibilityViewIsModal style={{width: '100%', maxWidth: 360, maxHeight: '80%', flexShrink: 1, minHeight: 0, transform: [{scale}]}}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
