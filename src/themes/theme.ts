// src/theme.ts
import { Theme } from '@react-navigation/native';

// ✅ Extend Theme with required fonts property
export type AppTheme = Theme & {
  name: string;
  gradient: string[];
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    textSecondary?: string;
    inputBackground?: string;
    success?: string;
    warning?: string;
    secondary?: string;
  };
};

// ✅ Define a default fonts configuration
const defaultFonts = {
  regular: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500' as const,
  },
  bold: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
  heavy: {
    fontFamily: 'System',
    fontWeight: '800' as const,
  },
};

export const Themes: AppTheme[] = [
  {
    name: "Ocean Breeze",
    dark: false,
    colors: {
      primary: "#00B4D8",
      background: "#CAF0F8",
      card: "#FFFFFF",
      text: "#03045E",
      border: "#90E0EF",
      notification: "#FF6B6B",
      textSecondary: "#0077B6",
      inputBackground: "#F8FDFE",
      success: "#06D6A0",
      warning: "#FFD166",
      secondary: "#90E0EF",
    },
    gradient: ["#00B4D8", "#90E0EF"],
    fonts: defaultFonts,
  },
  {
    name: "Sunset Glow",
    dark: false,
    colors: {
      primary: "#FF6B6B",
      background: "#FFE5D9",
      card: "#FFFFFF",
      text: "#4A1A2C",
      border: "#FFC4B2",
      notification: "#FF8C42",
      textSecondary: "#8B4513",
      inputBackground: "#FFF5F0",
      success: "#4ECDC4",
      warning: "#FFE66D",
      secondary: "#FFC4B2",
    },
    gradient: ["#FF6B6B", "#FFD93D"],
    fonts: defaultFonts,
  },
  {
    name: "Midnight Purple",
    dark: true,
    colors: {
      primary: "#9D4EDD",
      background: "#240046",
      card: "#3C096C",
      text: "#FFFFFF",
      border: "#5A189A",
      notification: "#FF6B6B",
      textSecondary: "#C77DFF",
      inputBackground: "#10002B",
      success: "#80FFDB",
      warning: "#FF9E00",
      secondary: "#5A189A",
    },
    gradient: ["#5A189A", "#9D4EDD"],
    fonts: defaultFonts,
  },
  {
    name: "Emerald Forest",
    dark: true,
    colors: {
      primary: "#2D6A4F",
      background: "#081C15",
      card: "#1B4332",
      text: "#FFFFFF",
      border: "#2D6A4F",
      notification: "#FF6B6B",
      textSecondary: "#95D5B2",
      inputBackground: "#0D261C",
      success: "#52B788",
      warning: "#F4A261",
      secondary: "#40916C",
    },
    gradient: ["#081C15", "#2D6A4F"],
    fonts: defaultFonts,
  },
  {
    name: "Neon Cyber",
    dark: true,
    colors: {
      primary: "#00F5D4",
      background: "#0F0E17",
      card: "#1A1A2E",
      text: "#E5E5E5",
      border: "#00F5D4",
      notification: "#FF6B6B",
      textSecondary: "#A8DADC",
      inputBackground: "#161625",
      success: "#00F5D4",
      warning: "#FF9E00",
      secondary: "#00BBF9",
    },
    gradient: ["#00F5D4", "#00BBF9", "#9B5DE5"],
    fonts: defaultFonts,
  },
  {
    name: "Coral Reef",
    dark: false,
    colors: {
      primary: "#FF7E5F",
      background: "#FFECD2",
      card: "#FFFFFF",
      text: "#3A3A3A",
      border: "#FFD8BF",
      notification: "#FF3D6E",
      textSecondary: "#8B4513",
      inputBackground: "#FFF5EB",
      success: "#4ECDC4",
      warning: "#FFD166",
      secondary: "#FEB47B",
    },
    gradient: ["#FF7E5F", "#FEB47B"],
    fonts: defaultFonts,
  },
  {
    name: "Aurora Sky",
    dark: true,
    colors: {
      primary: "#56CCF2",
      background: "#0B132B",
      card: "#1C2541",
      text: "#FFFFFF",
      border: "#3A506B",
      notification: "#FF6B6B",
      textSecondary: "#A8DADC",
      inputBackground: "#101A30",
      success: "#80FFDB",
      warning: "#FF9E00",
      secondary: "#2F80ED",
    },
    gradient: ["#56CCF2", "#2F80ED"],
    fonts: defaultFonts,
  },
  {
    name: "Royal Gold",
    dark: false,
    colors: {
      primary: "#FDC830",
      background: "#FFF8E1",
      card: "#FFFFFF",
      text: "#3E2723",
      border: "#FFECB3",
      notification: "#E65100",
      textSecondary: "#8D6E63",
      inputBackground: "#FFFDE7",
      success: "#4CAF50",
      warning: "#FF9800",
      secondary: "#F37335",
    },
    gradient: ["#FDC830", "#F37335"],
    fonts: defaultFonts,
  },
  {
    name: "Candy Pop",
    dark: false,
    colors: {
      primary: "#FF61A6",
      background: "#FFF0F6",
      card: "#FFFFFF",
      text: "#880E4F",
      border: "#F8BBD0",
      notification: "#FF4081",
      textSecondary: "#AD1457",
      inputBackground: "#FFF5F9",
      success: "#E91E63",
      warning: "#FF80AB",
      secondary: "#FFB199",
    },
    gradient: ["#FF61A6", "#FFB199"],
    fonts: defaultFonts,
  },
  {
    name: "Slate Tech",
    dark: true,
    colors: {
      primary: "#00C9A7",
      background: "#1B1B2F",
      card: "#162447",
      text: "#EAEAEA",
      border: "#1F4068",
      notification: "#FF5722",
      textSecondary: "#A8DADC",
      inputBackground: "#13132B",
      success: "#00C9A7",
      warning: "#FF9E00",
      secondary: "#92FE9D",
    },
    gradient: ["#00C9A7", "#92FE9D"],
    fonts: defaultFonts,
  },
  {
    name: "Crimson Night",
    dark: true,
    colors: {
      primary: "#FF1744",
      background: "#1A0000",
      card: "#2B0A0A",
      text: "#FFFFFF",
      border: "#400000",
      notification: "#FF5252",
      textSecondary: "#FF8A80",
      inputBackground: "#250000",
      success: "#FF5252",
      warning: "#FF6D00",
      secondary: "#FF616F",
    },
    gradient: ["#FF1744", "#FF616F"],
    fonts: defaultFonts,
  },
];