import type { ChooseOnStalePlan } from './stalePlanMessage';


export const chooseOnStalePlan: ChooseOnStalePlan = (wording, onChoice) => {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return;

  if (window.confirm(`${wording.title}\n\n${wording.body}\n\nOK to ${wording.discardLabel.toLowerCase()}.`)) {
    onChoice('discard');
    return;
  }
  if (window.confirm(`${wording.overwriteLabel}? This replaces what the other traveler saved.`)) {
    onChoice('overwrite');
    return;
  }
  onChoice('keep-editing');
};
