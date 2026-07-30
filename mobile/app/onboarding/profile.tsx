import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useMe } from '../../src/hooks/useMe';
import {
  HANDLE_MAX_LENGTH,
  handleFeedbackFor,
  normalizeHandleInput,
} from '../../src/onboarding/handleFeedback';
import { ONBOARDING_ROUTES, STEP_NUMBERS } from '../../src/onboarding/onboardingGate';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { useHandleAvailability, useUpdateProfile } from '../../src/query/travelerQueries';
import { colors, typography } from '../../src/theme';

const BIO_MAX_LENGTH = 500;

export default function ProfileStepScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit';

  const { state } = useMe();
  const save = useUpdateProfile();

  const [handle, setHandle] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const me = state.kind === 'ok' ? state.me : null;

  useEffect(() => {
    if (me === null || prefilled) return;
    setHandle(me.handle ?? me.suggestedHandle);
    setDisplayName(me.displayName);
    setBio(me.bio ?? '');
    setPrefilled(true);
  }, [me, prefilled]);

  const availability = useHandleAvailability(handle);
  const feedback = handleFeedbackFor(handle, availability.isFetching, availability.data);

  const submit = async () => {
    setMessage(null);
    try {
      await save.mutateAsync({ handle, displayName: displayName.trim(), bio: bio.trim() });
      router.replace(editing ? '/me' : ONBOARDING_ROUTES.goals);
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  return (
    <OnboardingScreen
      step={editing ? undefined : STEP_NUMBERS.profile}
      title={editing ? 'Edit your profile' : 'Create your profile'}
      subtitle="This is how other travelers will see you."
      message={message}
      footer={
        <Button
          label={editing ? 'Save' : 'Continue'}
          onPress={() => void submit()}
          busy={save.isPending}
          disabled={!feedback.submittable || save.isPending}
        />
      }
    >
      <Avatar
        photoUrl={me?.avatarUrl ?? null}
        displayName={displayName}
        email={me?.email ?? null}
      />

      <FormField
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        autoComplete="name"
      />

      <FormField
        label="Handle"
        value={handle}
        onChangeText={(raw) => setHandle(normalizeHandleInput(raw))}
        placeholder="yourhandle"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={HANDLE_MAX_LENGTH}
      />
      <Text style={[styles.feedback, styles[feedback.tone]]}>{feedback.text}</Text>

      <FormField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="A line about how you travel (optional)"
        multiline
        maxLength={BIO_MAX_LENGTH}
        style={styles.bio}
      />
    </OnboardingScreen>
  );
}

const BIO_HEIGHT = 96;

const styles = StyleSheet.create({
  feedback: { ...typography.caption },
  neutral: { color: colors.textSecondary },
  good: { color: colors.success },
  bad: { color: colors.danger },
  bio: { height: BIO_HEIGHT, textAlignVertical: 'top' },
});
