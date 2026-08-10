import { Alert } from 'react-native';
import type { ChooseOnStalePlan } from './stalePlanMessage';


export const chooseOnStalePlan: ChooseOnStalePlan = (wording, onChoice) => {
  Alert.alert(wording.title, wording.body, [
    { text: 'Keep editing', style: 'cancel', onPress: () => onChoice('keep-editing') },
    { text: wording.overwriteLabel, onPress: () => onChoice('overwrite') },
    { text: wording.discardLabel, style: 'destructive', onPress: () => onChoice('discard') },
  ]);
};
