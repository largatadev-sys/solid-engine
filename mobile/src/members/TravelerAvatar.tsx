import { StyleSheet, Text, View, type ImageStyle, type ViewStyle } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import { travelerColors, travelerMetrics, travelerRadii } from '../theme/workspaceTokens';
import { tintFor } from './avatarTints';


interface TravelerAvatarProps {
  readonly tintKey: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly size?: number;
  readonly style?: ImageStyle & ViewStyle;
  readonly accessibilityLabel?: string;
}


export function TravelerAvatar({
  tintKey,
  displayName,
  avatarUrl,
  size = travelerMetrics.avatar,
  style,
  accessibilityLabel,
}: TravelerAvatarProps) {
  const tint = tintFor(tintKey);
  const shape: ImageStyle & ViewStyle = {
    width: size,
    height: size,
    borderRadius: travelerRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: tint.well,
  };

  return (
    <MediaThumb
      url={avatarUrl}
      style={{ ...shape, ...style }}
      accessibilityLabel={accessibilityLabel ?? `${displayName}'s profile photo`}
      fallback={
        <Text style={[styles.initials, { color: tint.ink, fontSize: Math.round(size * 0.325) }]}>
          {initialsFor(displayName, null)}
        </Text>
      }
    />
  );
}


export function EnvelopeAvatar({ size = travelerMetrics.avatar }: { size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        styles.envelope,
        { width: size, height: size, borderRadius: travelerRadii.pill },
      ]}
    >
      <Icon name="mail" size={Math.round(size * 0.425)} color={travelerColors.iconMuted} />
    </View>
  );
}


const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
  },
  envelope: {
    backgroundColor: travelerColors.wellNeutral,
    borderWidth: 1,
    borderColor: travelerColors.hairline,
  },
});
