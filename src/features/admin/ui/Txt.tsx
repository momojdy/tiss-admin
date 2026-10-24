import { Text, TextProps, TextStyle } from 'react-native';
import { fonts, Weight } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export interface TxtProps extends TextProps {
  size?: number;
  weight?: Weight;
  color?: string;
  /** use the muted text colour */
  mut?: boolean;
  /** line-height as a multiple of size (CSS style) */
  lh?: number;
  ls?: number;
  align?: TextStyle['textAlign'];
}

/** Text with the Outfit font stack. Sizes are the CSS px values from the HTML. */
export function Txt({ size = 12, weight = 400, color, mut, lh, ls, align, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts[weight], fontSize: size, color: color ?? (mut ? c.mut : c.ink) },
        lh ? { lineHeight: size * lh } : null,
        ls ? { letterSpacing: ls } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
