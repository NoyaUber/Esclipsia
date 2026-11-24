export const EXPERIENCE_CURVES = Object.freeze({
  Fast: Object.freeze({ base: 14, exponent: 1.35, offset: 0 }),
  Medium: Object.freeze({ base: 20, exponent: 1.5, offset: 0 }),
  Slow: Object.freeze({ base: 26, exponent: 1.62, offset: 0 }),
});
export function experienceForNextLevel(level, curve = 'Medium', custom = null) {
  const cfg = custom && typeof custom === 'object' ? custom : (EXPERIENCE_CURVES[curve] ?? EXPERIENCE_CURVES.Medium);
  const n = Math.max(1, Math.floor(Number(level) || 1));
  return Math.max(1, Math.floor((Number(cfg.base) || 20) * Math.pow(n, Number(cfg.exponent) || 1.5) + (Number(cfg.offset) || 0)));
}
