/**
 * Theme.js - 디자인 토큰 (색상, 폰트, 간격)
 */
const THEMES = {
  default: {
    name: 'Default',
    primary: '#4ECDC4',
    primaryDark: '#2A9D96',
    secondary: '#FF6B6B',
    bg: { primary: '#0F0F1E', secondary: '#1A1A2E', tertiary: '#252540' },
    text: { primary: '#FFFFFF', secondary: '#B8B8D1', tertiary: '#6E6E89' },
    lane: { slap: '#FF6B6B', bass: '#FFD93D', tone: '#4ECDC4' },
    judgment: { perfect: '#FFD700', great: '#00E5FF', good: '#76FF03', miss: '#FF1744' },
    bgGradient: ['#0F0F1E', '#1A1A2E']
  },
  dark: {
    name: 'Dark',
    primary: '#9B59B6',
    primaryDark: '#6C3483',
    secondary: '#E67E22',
    bg: { primary: '#000000', secondary: '#0A0A0A', tertiary: '#1A1A1A' },
    text: { primary: '#FFFFFF', secondary: '#999999', tertiary: '#555555' },
    lane: { slap: '#9B59B6', bass: '#E67E22', tone: '#1ABC9C' },
    judgment: { perfect: '#FFD700', great: '#00E5FF', good: '#76FF03', miss: '#FF1744' },
    bgGradient: ['#000000', '#1A1A1A']
  },
  savanna: {
    name: 'Savanna',
    primary: '#F4A460',
    primaryDark: '#CD853F',
    secondary: '#8B4513',
    bg: { primary: '#3E2723', secondary: '#5D4037', tertiary: '#6D4C41' },
    text: { primary: '#FFF8E1', secondary: '#FFE0B2', tertiary: '#BCAAA4' },
    lane: { slap: '#FF6F00', bass: '#A0522D', tone: '#DAA520' },
    judgment: { perfect: '#FFD700', great: '#FFAB00', good: '#9CCC65', miss: '#D32F2F' },
    bgGradient: ['#3E2723', '#6D4C41']
  },
  night: {
    name: 'Night',
    primary: '#7C4DFF',
    primaryDark: '#5E35B1',
    secondary: '#00BCD4',
    bg: { primary: '#0D1B2A', secondary: '#1B263B', tertiary: '#415A77' },
    text: { primary: '#E0E1DD', secondary: '#A9B6C8', tertiary: '#778DA9' },
    lane: { slap: '#7C4DFF', bass: '#00BCD4', tone: '#FFEB3B' },
    judgment: { perfect: '#FFD700', great: '#00E5FF', good: '#76FF03', miss: '#FF1744' },
    bgGradient: ['#0D1B2A', '#415A77']
  }
};

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const RADIUS = { sm: 4, md: 8, lg: 16, xl: 24, full: 9999 };
const TYPO = {
  h1: { size: 48, weight: 800, family: "'Black Han Sans', sans-serif" },
  h2: { size: 32, weight: 700, family: "'Black Han Sans', sans-serif" },
  h3: { size: 24, weight: 600, family: 'sans-serif' },
  body: { size: 16, weight: 400, family: 'sans-serif' },
  caption: { size: 12, weight: 400, family: 'sans-serif' }
};
const ANIM = {
  fast: 150,
  normal: 300,
  slow: 500,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
};

const COLORBLIND_MAPS = {
  off: null,
  protanopia: { slap: '#0072B2', bass: '#F0E442', tone: '#56B4E9' },
  deuteranopia: { slap: '#D55E00', bass: '#F0E442', tone: '#0072B2' },
  tritanopia: { slap: '#CC79A7', bass: '#D55E00', tone: '#009E73' }
};

let activeTheme = 'default';
let colorblindMode = 'off';

export const Theme = {
  setTheme(name) {
    if (THEMES[name]) activeTheme = name;
  },
  setColorblind(mode) {
    if (COLORBLIND_MAPS[mode] !== undefined) colorblindMode = mode;
  },
  get current() {
    const t = THEMES[activeTheme];
    if (colorblindMode !== 'off' && COLORBLIND_MAPS[colorblindMode]) {
      return { ...t, lane: { ...t.lane, ...COLORBLIND_MAPS[colorblindMode] } };
    }
    return t;
  },
  get themes() { return THEMES; },
  spacing: SPACING,
  radius: RADIUS,
  typo: TYPO,
  anim: ANIM
};
