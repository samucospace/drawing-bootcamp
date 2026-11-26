import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppColors {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  diagramStroke: string;
  diagramMuted: string;
  diagramFill: string;
}

const LIGHT_COLORS: AppColors = {
  isDark: false,
  bg: '#FAF9F6',        // Warm off-white paper canvas
  surface: '#FFFFFF',
  surfaceAlt: '#F2EFE9',
  border: '#E5E0D6',
  text: '#1F1E1C',
  textMuted: '#6D6962',
  accent: '#BA623E',    // Warm terracotta pencil accent
  accentText: '#FFFFFF',
  success: '#3E7A55',
  successSoft: '#E6F2EA',
  warning: '#A66F24',
  warningSoft: '#F8EFE0',
  danger: '#B8433E',
  diagramStroke: '#252320',
  diagramMuted: '#8B857C',
  diagramFill: '#E6E1D8',
};

const DARK_COLORS: AppColors = {
  isDark: true,
  bg: '#161616',        // Neutral charcoal (never skews color/value judgment)
  surface: '#202020',
  surfaceAlt: '#2A2A2A',
  border: '#343434',
  text: '#F0EFEA',
  textMuted: '#9E9B93',
  accent: '#D47B56',
  accentText: '#161616',
  success: '#5CA97A',
  successSoft: '#1E3326',
  warning: '#D69A44',
  warningSoft: '#352A1B',
  danger: '#D8635E',
  diagramStroke: '#ECEAE4',
  diagramMuted: '#8D8A82',
  diagramFill: '#333333',
};

interface ThemeContextValue {
  colors: AppColors;
  preference: ThemePreference;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_COLORS,
  preference: 'system',
});

export function AppThemeProvider({
  preference = 'system',
  children,
}: {
  preference?: ThemePreference;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const value = useMemo(() => {
    const resolvedDark =
      preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
    return {
      colors: resolvedDark ? DARK_COLORS : LIGHT_COLORS,
      preference,
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
