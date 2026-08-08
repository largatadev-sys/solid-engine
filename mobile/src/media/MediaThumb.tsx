import type { ReactNode } from 'react';
import { Image, type ImageStyle, StyleSheet, View, type ViewStyle } from 'react-native';
import { thumbOf } from './mediaSourceContract';
import { useMediaSource } from './useMediaSource';


interface MediaThumbProps {
  readonly url: string | null;
  readonly style: ImageStyle & ViewStyle;
  readonly accessibilityLabel: string;
  readonly fallback?: ReactNode;
  readonly fallbackStyle?: ViewStyle;
  readonly localPreview?: string | null;
  readonly full?: boolean;
}


export function MediaThumb({
  url,
  style,
  accessibilityLabel,
  fallback,
  fallbackStyle,
  localPreview = null,
  full = false,
}: MediaThumbProps) {
  const uploaded = useMediaSource(full ? url : thumbOf(url));
  const source = uploaded ?? (localPreview === null ? null : { uri: localPreview });

  if (source === null) {
    if (fallback === undefined) return null;
    return <View style={[style, styles.fallback, fallbackStyle]}>{fallback}</View>;
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode="cover"
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}


const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
