import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectableChip } from '../../src/components/SelectableChip';
import { useMe } from '../../src/hooks/useMe';
import { ONBOARDING_ROUTES, STEP_NUMBERS } from '../../src/onboarding/onboardingGate';
import { INTERESTS, hasEnoughInterests, toggle } from '../../src/onboarding/preferenceOptions';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { useUpdateProfile } from '../../src/query/travelerQueries';
import { spacing } from '../../src/theme';


export default function InterestsStepScreen() {
  const router = useRouter();
  const { state } = useMe();
  const save = useUpdateProfile();

  const [selected, setSelected] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const me = state.kind === 'ok' ? state.me : null;

  useEffect(() => {
    if (me === null || prefilled) return;
    setSelected(me.interests);
    setPrefilled(true);
  }, [me, prefilled]);

  const submit = async () => {
    setMessage(null);
    try {
      await save.mutateAsync({ interests: selected });
      router.replace(ONBOARDING_ROUTES.travelSetup);
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  return (
    <OnboardingScreen
      step={STEP_NUMBERS.interests}
      title="What kind of trips interest you?"
      subtitle="Pick at least 3"
      message={message}
      footer={
        <Button
          label="Continue"
          onPress={() => void submit()}
          busy={save.isPending}
          disabled={!hasEnoughInterests(selected) || save.isPending}
        />
      }
    >
      <View style={styles.chips}>
        {INTERESTS.map((interest) => (
          <SelectableChip
            key={interest.value}
            label={interest.label}
            selected={selected.includes(interest.value)}
            onPress={() => setSelected(toggle(selected, interest.value))}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignContent: 'flex-start' },
});
