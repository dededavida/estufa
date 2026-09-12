import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { EstufaColors } from '@/constants/theme';

type LeafLogoProps = ViewProps & {
  size?: number;
  color?: string;
};

export function LeafLogo({ size = 28, color = EstufaColors.primary, style, ...rest }: LeafLogoProps) {
  return (
    <View style={[styles.wrap, { width: size + 8, height: size + 8 }, style]} {...rest}>
      <Ionicons name="leaf" size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
