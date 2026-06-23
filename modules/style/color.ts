/**
 * Color harmony scoring via HSL color wheel.
 *
 * Maps named colors to hue angles, then scores pairwise relationships:
 * - Complementary (180°) → highest score
 * - Analogous (0-30°) → good
 * - Triadic (120°) → good
 * - Monochromatic (all within 30°) → bonus
 */

// Named color → hue angle mapping. Covers common furniture/component colors.
const COLOR_HUES: Record<string, number> = {
  // Neutrals (hue 0, but we treat them specially)
  black: 0,
  white: 0,
  gray: 0,
  grey: 0,
  silver: 0,
  charcoal: 0,

  // Reds
  red: 0,
  crimson: 348,
  burgundy: 345,
  maroon: 0,
  coral: 16,
  salmon: 6,
  pink: 350,
  rose: 330,

  // Oranges
  orange: 30,
  amber: 45,
  peach: 28,
  copper: 28,

  // Yellows
  yellow: 60,
  gold: 51,
  lemon: 56,
  cream: 45,
  beige: 42,
  ivory: 60,

  // Greens
  green: 120,
  olive: 82,
  lime: 75,
  mint: 150,
  sage: 100,
  forest: 140,
  emerald: 140,
  teal: 174,

  // Blues
  blue: 240,
  navy: 240,
  sky: 200,
  cyan: 180,
  turquoise: 174,
  aqua: 180,
  cobalt: 215,
  indigo: 226,
  azure: 210,

  // Purples
  purple: 270,
  violet: 280,
  lavender: 270,
  plum: 300,
  magenta: 300,
  lilac: 285,

  // Browns / wood tones
  brown: 30,
  walnut: 25,
  oak: 35,
  mahogany: 15,
  cherry: 10,
  teak: 30,
  bamboo: 50,
  tan: 35,
  khaki: 55,
  chocolate: 25,
  coffee: 25,
  caramel: 30,
  sand: 45,
  wood: 30,
};

/** Map a color name string to a hue angle (0-360). Returns null if unknown. */
export function colorToHue(color: string): number | null {
  const key = color.toLowerCase().trim();
  // Direct match
  if (key in COLOR_HUES) return COLOR_HUES[key];
  // Try partial match (e.g. "dark walnut" → "walnut")
  for (const [name, hue] of Object.entries(COLOR_HUES)) {
    if (key.includes(name)) return hue;
  }
  return null;
}

/** Angular distance between two hue angles (0-180). */
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

/** Check if a hue is a "neutral" (achromatic: black, white, gray, silver, browns). */
function isNeutral(hue: number, colorName: string): boolean {
  const key = colorName.toLowerCase().trim();
  const neutrals = ["black", "white", "gray", "grey", "silver", "charcoal", "beige", "ivory", "cream", "tan", "khaki"];
  if (neutrals.some((n) => key.includes(n))) return true;
  // Browns with low saturation — hue near 25-45 range with "brown/walnut/oak" names
  if (hue >= 15 && hue <= 50 && ["brown", "walnut", "oak", "mahogany", "cherry", "teak", "bamboo", "chocolate", "coffee", "caramel", "sand", "wood", "tan"].some((n) => key.includes(n))) return true;
  return false;
}

export type ColorHarmonyResult = {
  score: number;
  palette: string[];
  scheme: "monochromatic" | "analogous" | "complementary" | "triadic" | "mixed";
  suggestions: string[];
};

/**
 * Score color harmony of a set of color names.
 * Returns 0-100 score + detected scheme + suggestions.
 */
export function scoreColorHarmony(colors: string[]): ColorHarmonyResult {
  const suggestions: string[] = [];

  if (colors.length === 0) {
    return { score: 50, palette: [], scheme: "mixed", suggestions: ["No color data available for components."] };
  }

  // Map colors to hues
  const hues: { name: string; hue: number }[] = [];
  for (const c of colors) {
    const hue = colorToHue(c);
    if (hue !== null) hues.push({ name: c, hue });
  }

  if (hues.length === 0) {
    return { score: 50, palette: colors, scheme: "mixed", suggestions: ["Could not recognize any component colors."] };
  }

  // Separate neutrals from chromatic
  const chromatic = hues.filter((h) => !isNeutral(h.hue, h.name));
  const neutrals = hues.filter((h) => isNeutral(h.hue, h.name));

  // If all neutral → monochromatic, high score
  if (chromatic.length === 0) {
    const palette = [...new Set(colors)];
    return {
      score: 85,
      palette,
      scheme: "monochromatic",
      suggestions: palette.length <= 2
        ? ["Clean neutral palette. Consider adding a subtle accent color for visual interest."]
        : ["Good neutral variety. The tones work well together."],
    };
  }

  // Analyze pairwise relationships
  let complementaryPairs = 0;
  let analogousPairs = 0;
  let triadicPairs = 0;
  let totalPairs = 0;

  const allHues = hues.map((h) => h.hue);
  const chromaticHues = chromatic.map((h) => h.hue);

  for (let i = 0; i < chromaticHues.length; i++) {
    for (let j = i + 1; j < chromaticHues.length; j++) {
      totalPairs++;
      const dist = hueDistance(chromaticHues[i], chromaticHues[j]);
      if (dist >= 150 && dist <= 210) complementaryPairs++;
      else if (dist <= 45) analogousPairs++;
      else if (dist >= 100 && dist <= 140) triadicPairs++;
    }
  }

  // Also count neutral-chromatic pairs (neutrals go with everything)
  const neutralChromaticBonus = neutrals.length * chromatic.length * 0.5;

  // Detect scheme
  let scheme: ColorHarmonyResult["scheme"] = "mixed";
  const uniqueChromaticHues = [...new Set(chromaticHues.map((h) => Math.round(h / 30) * 30))];

  if (uniqueChromaticHues.length <= 1) {
    scheme = "monochromatic";
  } else if (complementaryPairs > 0 && complementaryPairs >= totalPairs * 0.3) {
    scheme = "complementary";
  } else if (triadicPairs > 0 && triadicPairs >= totalPairs * 0.2) {
    scheme = "triadic";
  } else if (analogousPairs > 0 && analogousPairs >= totalPairs * 0.4) {
    scheme = "analogous";
  }

  // Score calculation
  let rawScore = 50; // baseline

  if (totalPairs > 0) {
    const compRatio = complementaryPairs / totalPairs;
    const anaRatio = analogousPairs / totalPairs;
    const triRatio = triadicPairs / totalPairs;

    rawScore += compRatio * 40;
    rawScore += anaRatio * 25;
    rawScore += triRatio * 30;
  }

  // Neutral bonus — neutrals make any palette more cohesive
  rawScore += Math.min(15, neutralChromaticBonus * 3);

  // Penalty for too many unrelated chromatic colors
  if (uniqueChromaticHues.length > 3 && complementaryPairs === 0 && triadicPairs === 0) {
    rawScore -= 20;
    suggestions.push("Multiple unrelated colors detected. Consider sticking to 2-3 main hues.");
  }

  // Scheme-specific suggestions
  const palette = [...new Set(colors)];

  switch (scheme) {
    case "monochromatic":
      suggestions.push("Monochromatic palette — very cohesive. Add a textural accent for depth.");
      break;
    case "complementary":
      suggestions.push("Nice complementary color pairing. Good visual contrast.");
      break;
    case "analogous":
      suggestions.push("Analogous colors create a harmonious, calming feel.");
      break;
    case "triadic":
      suggestions.push("Triadic palette — vibrant and balanced.");
      break;
    case "mixed":
      if (neutrals.length > 0) {
        suggestions.push("Neutral base helps tie the colors together.");
      } else {
        suggestions.push("Try anchoring the palette with a neutral (black, white, wood tone) to unify the colors.");
      }
      break;
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return { score, palette, scheme, suggestions };
}
