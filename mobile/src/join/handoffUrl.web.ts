import { StripHandoffParam, urlWithoutHandoffParam } from './handoffParam';

export const stripHandoffParam: StripHandoffParam = () => {
  const cleaned = urlWithoutHandoffParam(window.location.href);
  if (cleaned === null) return;

  window.history.replaceState(null, '', cleaned);
};
