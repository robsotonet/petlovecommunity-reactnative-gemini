import { useColorScheme } from 'react-native';
import { getColors } from '../styles/colors';

export const useColors = () => {
  const colorScheme = useColorScheme();
  return getColors(colorScheme);
};
