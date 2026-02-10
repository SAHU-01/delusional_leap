export const Colors = {
  hibiscus: '#FF3366',
  sunset: '#FF6B35',
  amber: '#FFAA33',
  cream: '#FFFBF5',
  deepPlum: '#1B0A2E',
  skyTeal: '#5EEAD4',
} as const;

export const Fonts = {
  fraunces: {
    regular: 'Fraunces-Regular',
    medium: 'Fraunces-Medium',
    semiBold: 'Fraunces-SemiBold',
    bold: 'Fraunces-Bold',
  },
  sora: {
    regular: 'Sora-Regular',
    medium: 'Sora-Medium',
    semiBold: 'Sora-SemiBold',
    bold: 'Sora-Bold',
  },
} as const;

export type ColorName = keyof typeof Colors;
export type FontFamily = typeof Fonts;
