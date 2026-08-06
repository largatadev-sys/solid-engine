import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { useMe } from '../../src/hooks/useMe';
import {
  HANDLE_MAX_LENGTH,
  handleFeedbackFor,
  normalizeHandleInput,
} from '../../src/onboarding/handleFeedback';
import { PROFILE_TAB_ROUTE } from '../../src/navigation/authRoutes';
import { ONBOARDING_ROUTES, STEP_NUMBERS } from '../../src/onboarding/onboardingGate';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { AvatarPicker } from '../../src/media/AvatarPicker';
import { pickPhoto } from '../../src/media/pickPhoto';
import { messageForPhotoFailure } from '../../src/media/photoMessages';
import {
  useHandleAvailability,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from '../../src/query/travelerQueries';
import { colors, spacing, typography } from '../../src/theme';

const BIO_MAX_LENGTH = 500;

export default function ProfileStepScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit';

  const { state } = useMe();
  const save = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

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
      router.replace(editing ? PROFILE_TAB_ROUTE : ONBOARDING_ROUTES.goals);
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  const choosePhoto = async () => {
    setMessage(null);
    const picked = await pickPhoto();
    if (picked === null) return;
    try {
      await uploadAvatar.mutateAsync(picked);
    } catch (error) {
      setMessage(messageForPhotoFailure(error));
    }
  };

  const dropPhoto = async () => {
    setMessage(null);
    try {
      await removeAvatar.mutateAsync();
    } catch (error) {
      setMessage(messageForPhotoFailure(error));
    }
  };

  return (
    <OnboardingScreen
      step={editing ? undefined : STEP_NUMBERS.profile}
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
      <View style={styles.avatarBlock}>
        <AvatarPicker
          photoUrl={me?.avatarUrl ?? null}
          displayName={displayName}
          email={me?.email ?? null}
          busy={uploadAvatar.isPending || removeAvatar.isPending}
          onPick={() => void choosePhoto()}
          onRemove={() => void dropPhoto()}
        />
      </View>

      <View style={styles.fields}>
        <FormField
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Jane Doe"
          autoComplete="name"
        />

        <View>
          <FormField
            label="Username"
            prefix="@"
            value={handle}
            onChangeText={(raw) => setHandle(normalizeHandleInput(raw))}
            placeholder="janedoe"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={HANDLE_MAX_LENGTH}
          />
          <Text style={[styles.feedback, styles[feedback.tone]]}>{feedback.text}</Text>
        </View>

        <FormField
          label="Bio (Optional)"
          area
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about your travel style..."
          multiline
          maxLength={BIO_MAX_LENGTH}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md },
  fields: { gap: spacing.md },
  feedback: { ...typography.caption, paddingTop: spacing.xs },
  neutral: { color: colors.textSecondary },
  good: { color: colors.success },
  bad: { color: colors.danger },
});
