/**
 * One chart config for the whole dashboard. Per-chart theming is how a set of
 * charts stops looking like one system.
 *
 * These are the only hex literals outside tailwind.config.js, and they exist
 * because SVG gradient stops and stroke attributes cannot read Tailwind
 * classes. They mirror `colors.chart` in the config — change both together.
 */
export const CHART = {
  series: ['#c9a96e', '#e7e5e4', '#8a8580', '#e7d3a3', '#a8a29e', '#b08d4f'],
  track: '#282f35',
  grid: 'rgba(255,255,255,0.045)',
  axis: '#858d97',
  lime: '#c9a96e',
  limeLight: '#e7d3a3',
  limeMid: '#b08d4f',
  emerald: '#a8a29e',
  emeraldMid: '#e7e5e4',
} as const;

/** Avatar palette — [background, foreground]. §2.5. */
export const AVATAR_TONES: readonly (readonly [string, string])[] = [
  ['#2a241a', '#e7d3a3'],
  ['#232323', '#e7e5e4'],
  ['#1f1f1f', '#d6d3d1'],
  ['#2a241a', '#c9a96e'],
  ['#262626', '#f5f5f4'],
  ['#1c1c1c', '#c9a96e'],
];
