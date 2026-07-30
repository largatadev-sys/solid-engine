import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button } from '../../src/components/Button';
import { FormField } from '../../src/components/FormField';
import { OnboardingScreen } from '../../src/components/OnboardingScreen';
import { OptionPicker } from '../../src/components/OptionPicker';
import { useMe } from '../../src/hooks/useMe';
import { COUNTRIES, CURRENCIES } from '../../src/onboarding/countries';
import { deviceRegion } from '../../src/onboarding/deviceRegion';
import { currencyForCountry, defaultsForRegion } from '../../src/onboarding/localeDefaults';
import { ONBOARDING_ROUTES, STEP_NUMBERS } from '../../src/onboarding/onboardingGate';
import { messageForVerificationFailure } from '../../src/onboarding/verificationMessages';
import { useUpdateProfile } from '../../src/query/travelerQueries';

const CITY_MAX_LENGTH = 100;

export default function TravelSetupStepScreen() {
  const router = useRouter();
  const { state } = useMe();
  const save = useUpdateProfile();

  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const me = state.kind === 'ok' ? state.me : null;

  useEffect(() => {
    if (me === null || prefilled) return;
    const fromLocale = defaultsForRegion(deviceRegion());
    setCountry(me.country ?? fromLocale.country);
    setCurrency(me.preferredCurrency ?? fromLocale.currency);
    setHomeCity(me.homeCity ?? '');
    setPrefilled(true);
  }, [me, prefilled]);

  const chooseCountry = (code: string) => {
    setCountry(code);
    setCurrency(currencyForCountry(code));
  };

  const submit = async () => {
    setMessage(null);
    try {
      await save.mutateAsync({ country, preferredCurrency: currency, homeCity: homeCity.trim() });
      router.replace(ONBOARDING_ROUTES.complete);
    } catch (error) {
      setMessage(messageForVerificationFailure(error));
    }
  };

  return (
    <OnboardingScreen
      step={STEP_NUMBERS.travelSetup}
      title="Set up your travel"
      subtitle="We prefilled these from your device. Change anything that is wrong."
      message={message}
      footer={
        <Button
          label="Continue"
          onPress={() => void submit()}
          busy={save.isPending}
          disabled={country === '' || currency === '' || save.isPending}
        />
      }
    >
      <OptionPicker
        label="Country"
        value={country}
        options={COUNTRIES.map((entry) => ({ value: entry.code, label: entry.name }))}
        onSelect={chooseCountry}
      />

      <OptionPicker
        label="Preferred currency"
        value={currency}
        options={CURRENCIES.map((code) => ({ value: code, label: code }))}
        onSelect={setCurrency}
      />

      <FormField
        label="Home city"
        value={homeCity}
        onChangeText={setHomeCity}
        placeholder="Where you usually set off from (optional)"
        maxLength={CITY_MAX_LENGTH}
      />
    </OnboardingScreen>
  );
}
