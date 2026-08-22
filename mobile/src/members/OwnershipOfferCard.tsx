import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import {
  travelerColors,
  travelerMetrics,
  travelerRadii,
  travelerTypography,
} from '../theme/workspaceTokens';

import { offerCardTitle, OFFER_ACCEPT_LABEL, OFFER_DECLINE_LABEL } from './travelerCopy';


interface OwnershipOfferCardProps {
  readonly offererLabel: string;
  readonly onAccept: () => void;
  readonly onDecline: () => void;
  readonly busy: boolean;
}


export function OwnershipOfferCard({
  offererLabel,
  onAccept,
  onDecline,
  busy,
}: OwnershipOfferCardProps) {
  const accept = usePressFeedback();
  const decline = usePressFeedback();

  return (
    <View style={styles.card}>
      <Icon name="transfer" size={travelerMetrics.offerIcon} color={travelerColors.accent} />

      <Text style={styles.title} numberOfLines={2}>
        {offerCardTitle(offererLabel)}
      </Text>

      <AnimatedPressable
        style={[styles.acceptPill, { opacity: accept.opacity }]}
        onPressIn={accept.onPressIn}
        onPressOut={accept.onPressOut}
        onPress={onAccept}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={`${OFFER_ACCEPT_LABEL} ownership of this trip`}
      >
        <Text style={styles.acceptLabel}>{OFFER_ACCEPT_LABEL}</Text>
      </AnimatedPressable>

      <AnimatedPressable
        style={[styles.declineHit, { opacity: decline.opacity }]}
        onPressIn={decline.onPressIn}
        onPressOut={decline.onPressOut}
        onPress={onDecline}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        accessibilityLabel={`${OFFER_DECLINE_LABEL} ownership of this trip`}
      >
        <Text style={styles.declineLabel}>{OFFER_DECLINE_LABEL}</Text>
      </AnimatedPressable>
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: travelerMetrics.rowPaddingH,
    marginTop: 12,
    marginBottom: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: travelerColors.wellWarm,
    borderWidth: 1,
    borderColor: travelerColors.accentBorder,
    borderRadius: travelerRadii.card,
  },
  title: {
    flex: 1,
    ...travelerTypography.offerTitle,
    color: travelerColors.ink,
  },
  acceptPill: {
    flexShrink: 0,
    backgroundColor: travelerColors.accent,
    borderRadius: travelerRadii.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  acceptLabel: {
    ...travelerTypography.offerAccept,
    color: travelerColors.onAccent,
  },
  declineHit: {
    flexShrink: 0,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  declineLabel: {
    ...travelerTypography.offerDecline,
    color: travelerColors.muted,
  },
});
