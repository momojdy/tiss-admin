import {Text, type TextProps} from 'react-native';
import {useEditableText} from './editContext';
export type CmsTextProps = TextProps & {cmsKey?:string;cmsKeys?:string[]};
/** Text identity travels as a prop; no wrapper changes customer layout/typography. */
export function EditableNativeText({cmsKey,cmsKeys,children,...props}:CmsTextProps) {
 const editable=useEditableText(children,cmsKey,cmsKeys);
 return <Text {...props} {...editable}>{children}</Text>;
}
