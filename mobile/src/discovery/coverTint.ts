import { coverTints } from '../theme/workspaceTokens';


export type CoverTint = { readonly base: string; readonly wash: string };


export function coverTintFor(subject: string): CoverTint {
  return coverTints[hash(subject) % coverTints.length] ?? coverTints[0];
}


function hash(seed: string): number {
  let accumulated = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    accumulated ^= seed.charCodeAt(index);
    accumulated = Math.imul(accumulated, 16777619);
  }
  accumulated ^= accumulated >>> 15;
  return accumulated >>> 0;
}
