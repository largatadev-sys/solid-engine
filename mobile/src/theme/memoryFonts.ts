export const outfit = 'Outfit_700Bold';

export const dm = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_600SemiBold',
} as const;

export const geist = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semiBold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;

export const figtree = {
  regular: 'Figtree_400Regular',
  semiBold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export const inter = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export const memoryFontNames: readonly string[] = [
  outfit,
  ...Object.values(dm),
  ...Object.values(geist),
  ...Object.values(figtree),
  ...Object.values(inter),
];
