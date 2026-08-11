import { profileMetrics } from '../theme/workspaceTokens';
import type { DiaryEntryResponse } from '../types/api';
import { postcardClock } from './postcardAnatomy';


const PHOTO_PEEK = profileMetrics.photoPeek;


export function pageOfOffset(offset: number, photoWidth: number, photoCount: number): number {
  if (photoWidth <= 0) return 0;

  const landed = Math.round(offset / photoWidth);
  return Math.min(Math.max(landed, 0), Math.max(photoCount - 1, 0));
}


export function carouselPhotoWidth(stageWidth: number, photoCount: number): number {
  if (stageWidth <= 0 || photoCount <= 1) return Math.max(stageWidth, 0);

  const peeked = stageWidth - PHOTO_PEEK;
  return peeked <= 0 ? stageWidth : peeked;
}


export function showsCarouselChrome(photoCount: number): boolean {
  return photoCount > 1;
}


export function carouselCounter(page: number, photoCount: number): string {
  return `${page + 1}/${photoCount}`;
}


export function previewCount(page: number, photoCount: number): string | null {
  return photoCount > 1 ? `${page + 1} of ${photoCount}` : null;
}


export function dayTimeBadge(
  entry: Pick<DiaryEntryResponse, 'dayLabel' | 'timeOfDay'>,
): string {
  const at = entry.timeOfDay === null ? null : postcardClock(entry.timeOfDay);
  return at === null ? entry.dayLabel : `${entry.dayLabel} · ${at}`;
}


export function likesLabel(likes: number): string {
  return likes === 1 ? '1 like' : `${likes} likes`;
}
