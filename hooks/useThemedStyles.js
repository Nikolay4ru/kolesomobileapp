// hooks/useThemedStyles.js
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const useThemedStyles = (styles) => {
  const { colors, theme } = useTheme();
  
  return useMemo(
    () => StyleSheet.create(styles(colors, theme)),
    [colors, theme]
  );
};