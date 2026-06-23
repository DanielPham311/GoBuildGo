/**
 * Theme consistency scoring.
 *
 * Compares a setup's component style tags + colors against a Theme's
 * declared tags and color palette.
 */

import { prisma } from "@/shared/db";

export type ThemeConsistencyResult = {
  score: number;
  matchedTags: string[];
  missingTags: string[];
  suggestions: string[];
};

/**
 * Score how well a setup matches its declared theme.
 * setupTags: union of all component styleTags in the setup
 * setupColors: union of all component colors in the setup
 */
export async function scoreThemeConsistency(
  setupTheme: string | null | undefined,
  setupTags: string[],
  setupColors: string[],
): Promise<ThemeConsistencyResult> {
  const suggestions: string[] = [];

  if (!setupTheme) {
    return {
      score: 50,
      matchedTags: [],
      missingTags: [],
      suggestions: ["No theme selected. Assigning a theme enables consistency scoring."],
    };
  }

  // Find theme by name (case-insensitive)
  const theme = await prisma.theme.findFirst({
    where: { name: { equals: setupTheme, mode: "insensitive" } },
  });

  if (!theme) {
    return {
      score: 50,
      matchedTags: [],
      missingTags: [],
      suggestions: [`Theme "${setupTheme}" not found in database.`],
    };
  }

  const themeTags = theme.styleTags ?? [];
  const themePalette = theme.colorPalette ?? [];

  // Tag overlap (Jaccard similarity)
  const setupTagSet = new Set(setupTags.map((t) => t.toLowerCase()));
  const themeTagSet = new Set(themeTags.map((t) => t.toLowerCase()));

  const intersection = [...themeTagSet].filter((t) => setupTagSet.has(t));
  const union = new Set([...themeTagSet, ...setupTagSet]);
  const tagJaccard = union.size > 0 ? intersection.length / union.size : 0;

  // Color palette match
  const setupColorSet = new Set(setupColors.map((c) => c.toLowerCase()));
  const themeColorSet = new Set(themePalette.map((c) => c.toLowerCase()));
  const colorMatches = [...themeColorSet].filter((c) => setupColorSet.has(c));
  const colorScore = themeColorSet.size > 0 ? colorMatches.length / themeColorSet.size : 0.5; // neutral if no palette

  // Combined: 60% tag overlap + 40% palette match
  const rawScore = tagJaccard * 60 + colorScore * 40;

  const matchedTags = intersection;
  const missingTags = [...themeTagSet].filter((t) => !setupTagSet.has(t));

  // Generate suggestions
  if (missingTags.length > 0) {
    const tagSuggestions = missingTags.slice(0, 3).map((t) => `Add a "${t}" component to better match the ${theme.name} theme.`);
    suggestions.push(...tagSuggestions);
  }

  if (themePalette.length > 0 && colorMatches.length === 0) {
    suggestions.push(`This theme uses ${themePalette.join(", ")}. Consider incorporating these colors.`);
  }

  if (rawScore >= 70) {
    suggestions.push("Good theme alignment! Components match the declared style well.");
  }

  return {
    score: Math.round(rawScore),
    matchedTags,
    missingTags,
    suggestions,
  };
}
