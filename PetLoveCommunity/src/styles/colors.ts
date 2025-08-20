import { Appearance } from 'react-native';

const lightColors = {
  primary: {
    coral: '#FF6B6B',
    teal: '#4ECDC4',
  },
  neutral: {
    beige: '#F7FFF7',
    midnight: '#1A535C',
  },
  extended: {
    coralVariations: {
      light: '#FF8E8E',
      dark: '#E55555',
    },
    tealVariations: {
      light: '#6ED4CC',
      dark: '#3BB5B0',
      background: '#E8F8F7',
    },
    textVariations: {
      secondary: '#2C6B73',
      tertiary: '#6C757D',
    },
  },
  semantic: {
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E74C3C',
    info: '#74B9FF',
  },
};

const darkColors = {
  primary: {
    coral: '#FF6B6B',
    teal: '#4ECDC4',
  },
  neutral: {
    beige: '#1A1A1A',
    midnight: '#FFFFFF',
  },
  extended: {
    coralVariations: {
      light: '#FF8E8E',
      dark: '#E55555',
    },
    tealVariations: {
      light: '#6ED4CC',
      dark: '#3BB5B0',
      background: '#333333',
    },
    textVariations: {
      secondary: '#E8F8F7',
      tertiary: '#6C757D',
    },
  },
  semantic: {
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E74C3C',
    info: '#74B9FF',
  },
};

export const getColors = () => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
};