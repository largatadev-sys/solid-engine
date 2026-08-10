export type StalePlanChoice = 'discard' | 'overwrite' | 'keep-editing';

export type StalePlanWording = {
  title: string;
  body: string;

  discardLabel: string;

  overwriteLabel: string;
};

export type ChooseOnStalePlan = (
  wording: StalePlanWording,
  onChoice: (choice: StalePlanChoice) => void,
) => void;


export function stalePlanWording(): StalePlanWording {
  return {
    title: 'This plan changed while you were away',
    body: 'Someone else saved changes to this trip. Discard yours to load theirs, or save yours anyway and replace what they saved.',
    discardLabel: 'Discard my changes',
    overwriteLabel: 'Save anyway',
  };
}
