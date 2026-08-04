import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { SelectableOption } from '../../src/components/SelectableOption';
import { useMe } from '../../src/hooks/useMe';
import { ONBOARDING_ROUTES, STEP_NUMBERS } from '../../src/onboarding/onboardingGate';
import { GOALS, toggle } from '../../src/onboarding/preferenceOptions';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { useUpdateProfile } from '../../src/query/travelerQueries';
import { spacing } from '../../src/theme';


export default function GoalsStepScreen() {
  const router = useRouter();
  const { state } = useMe();
  const save = useUpdateProfile();

  const [selected, setSelected] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const me = state.kind === 'ok' ? state.me : null;

  useEffect(() => {
    if (me === null || prefilled) return;
    setSelected(me.goals);
    setPrefilled(true);
  }, [me, prefilled]);

  const submit = async () => {
    setMessage(null);
    try {
      await save.mutateAsync({ goals: selected });
      router.replace(ONBOARDING_ROUTES.interests);
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  return (
    <OnboardingScreen
      step={STEP_NUMBERS.goals}
      title="What are you hoping to do?"
      subtitle="Select all that apply"
      message={message}
      footer={
        <Button label="Continue" onPress={() => void submit()} busy={save.isPending} />
      }
    >
      <View style={styles.list}>
        {GOALS.map((goal) => (
          <SelectableOption
            key={goal.value}
            label={goal.label}
            icon={goal.icon ?? 'compass'}
            selected={selected.includes(goal.value)}
            onPress={() => setSelected(toggle(selected, goal.value))}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
});
