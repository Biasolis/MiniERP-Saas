import { create } from 'zustand';
import { ThemeType, defaultTheme } from '../styles/theme';

interface ThemeStore {
  currentTheme: ThemeType;
  setThemeColor: (color: string) => void;
  loadThemeFromAPI: (config: any) => void; // Recebe o JSONB do banco
}

export const useThemeStore = create<ThemeStore>((set) => ({
  currentTheme: defaultTheme,

  setThemeColor: (color) =>
    set((state) => ({
      currentTheme: {
        ...state.currentTheme,
        colors: { ...state.currentTheme.colors, primary: color },
      },
    })),

  loadThemeFromAPI: (config) => {
      // Lógica para transformar o JSON do banco no objeto ThemeType
      if (config?.primaryColor) {
          set((state) => ({
              currentTheme: {
                  ...state.currentTheme,
                  colors: { ...state.currentTheme.colors, primary: config.primaryColor }
              }
          }))
      }
  }
}));