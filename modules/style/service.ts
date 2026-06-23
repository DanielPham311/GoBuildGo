import { prisma } from "@/shared/db";
import { scoreColorHarmony } from "./color";
import { scoreThemeConsistency } from "./themes";

export type StyleScore = {
  overall: number;
  colorHarmony: {
    score: number;
    palette: string[];
    scheme: "monochromatic" | "analogous" | "complementary" | "triadic" | "mixed";
    suggestions: string[];
  };
  themeConsistency: {
    score: number;
    matchedTags: string[];
    missingTags: string[];
    suggestions: string[];
  };
  spaceFit: {
    score: number;
    utilization: number;
    suggestions: string[];
  } | null;
  budgetBalance: {
    score: number;
    categoryBreakdown: { category: string; amount: number; share: number }[];
    suggestions: string[];
  };
};

/**
 * Score a setup on all 4 dimensions and return detailed analysis.
 * Each dimension is 0-100. Overall is weighted average (25% each).
 * Dimensions with null data are excluded from weighting.
 */
export async function scoreSetup(setupId: string): Promise<StyleScore | null> {
  const setup = await prisma.setup.findUnique({
    where: { id: setupId },
    include: {
      items: {
        include: {
          component: {
            include: {
              prices: {
                where: { isAvailable: true },
                orderBy: { price: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!setup) return null;

  // --- Gather data ---
  const components = setup.items.map((i) => i.component);
  const allColors = [...new Set(components.flatMap((c) => c.colors ?? []))];
  const allTags = [...new Set(components.flatMap((c) => c.styleTags ?? []))];

  // --- 1. Color Harmony ---
  const colorResult = scoreColorHarmony(allColors);

  // --- 2. Theme Consistency ---
  const themeResult = await scoreThemeConsistency(setup.theme, allTags, allColors);

  // --- 3. Space Fit ---
  const spaceResult = scoreSpaceFit(setup.roomDimensions, components);

  // --- 4. Budget Balance ---
  const budgetResult = scoreBudgetBalance(setup.items);

  // --- Weighted overall ---
  const scores: number[] = [];
  scores.push(colorResult.score);
  scores.push(themeResult.score);
  if (spaceResult) scores.push(spaceResult.score);
  scores.push(budgetResult.score);

  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    overall,
    colorHarmony: colorResult,
    themeConsistency: themeResult,
    spaceFit: spaceResult,
    budgetBalance: budgetResult,
  };
}

// --- Space Fit ---

type RoomDims = { width: number; depth: number; height?: number } | null;
type ComponentDims = { width?: number; depth?: number; height?: number };

function scoreSpaceFit(
  roomDims: unknown,
  components: { dimensions: unknown }[],
): StyleScore["spaceFit"] {
  const suggestions: string[] = [];

  if (!roomDims || typeof roomDims !== "object") {
    return null;
  }

  const rd = roomDims as RoomDims;
  if (!rd || !rd.width || !rd.depth) return null;

  const roomArea = rd.width * rd.depth;

  if (roomArea <= 0) return null;

  // Sum component footprints
  let usedArea = 0;
  let hasDimensions = false;

  for (const c of components) {
    if (!c.dimensions || typeof c.dimensions !== "object") continue;
    const d = c.dimensions as ComponentDims;
    if (d.width && d.depth) {
      usedArea += d.width * d.depth;
      hasDimensions = true;
    }
  }

  if (!hasDimensions) {
    suggestions.push("No component dimension data available. Add dimensions to enable space scoring.");
    return null;
  }

  const utilization = usedArea / roomArea;

  let score: number;
  if (utilization >= 0.3 && utilization <= 0.6) {
    score = 100;
    suggestions.push("Great space utilization — room feels well-furnished without being cramped.");
  } else if (utilization < 0.3) {
    score = Math.round((utilization / 0.3) * 80);
    suggestions.push("Room feels sparse. Consider adding more furniture or larger pieces.");
  } else if (utilization <= 0.7) {
    score = Math.round(100 - ((utilization - 0.6) / 0.1) * 20);
    suggestions.push("Room is getting full. Ensure there's enough walkway space.");
  } else {
    score = Math.max(20, Math.round(60 - ((utilization - 0.7) / 0.3) * 40));
    suggestions.push("Room may be overcrowded. Consider removing or downsizing some items.");
  }

  return { score: Math.max(0, Math.min(100, score)), utilization: Math.round(utilization * 1000) / 1000, suggestions };
}

// --- Budget Balance ---

function scoreBudgetBalance(
  items: { component: { category: string }; quantity: number; componentId: string }[],
): StyleScore["budgetBalance"] {
  const suggestions: string[] = [];

  if (items.length === 0) {
    return {
      score: 50,
      categoryBreakdown: [],
      suggestions: ["No items in setup to analyze."],
    };
  }

  // Get cheapest price per component
  const componentPrices = new Map<string, number>();
  for (const item of items) {
    const prices = (item.component as unknown as { prices?: { price: number }[] }).prices;
    if (prices && prices.length > 0) {
      componentPrices.set(item.componentId, Number(prices[0].price));
    }
  }

  if (componentPrices.size === 0) {
    return {
      score: 50,
      categoryBreakdown: [],
      suggestions: ["No price data available for components."],
    };
  }

  // Group by category
  const categoryTotals = new Map<string, number>();
  let totalSpend = 0;

  for (const item of items) {
    const price = componentPrices.get(item.componentId) ?? 0;
    const amount = price * item.quantity;
    const cat = item.component.category;
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + amount);
    totalSpend += amount;
  }

  if (totalSpend === 0) {
    return {
      score: 50,
      categoryBreakdown: [],
      suggestions: ["All components have zero price. Check price data."],
    };
  }

  const breakdown = [...categoryTotals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: Math.round((amount / totalSpend) * 1000) / 1000,
    }))
    .sort((a, b) => b.amount - a.amount);

  // HHI calculation
  const hhi = breakdown.reduce((sum, b) => sum + b.share * b.share, 0);

  let score: number;
  if (hhi <= 0.15) {
    score = 90;
    suggestions.push("Well-balanced budget across categories.");
  } else if (hhi <= 0.25) {
    score = 100;
    suggestions.push("Excellent budget distribution.");
  } else if (hhi <= 0.4) {
    score = 70;
    suggestions.push(`Heavy spend on ${breakdown[0].category}. Consider balancing with other categories.`);
  } else if (hhi <= 0.6) {
    score = 50;
    suggestions.push(`Budget is concentrated on ${breakdown[0].category}. Diversify for a more complete setup.`);
  } else {
    score = 35;
    suggestions.push(`Almost all budget in ${breakdown[0].category}. A good setup needs multiple categories.`);
  }

  // Category count bonus
  if (breakdown.length >= 4) {
    score = Math.min(100, score + 5);
    suggestions.push("Good category diversity!");
  }

  return { score: Math.max(0, Math.min(100, score)), categoryBreakdown: breakdown, suggestions };
}
