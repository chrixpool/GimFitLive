import type { NutritionTargets } from '../types/workout';

const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';

type OpenFoodFactsProduct = {
  product_name?: string;
  quantity?: string;
  serving_size?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, unknown>;
};

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[];
};

export type FoodLookupResult = NutritionTargets & {
  id: string;
  name: string;
  quantity?: string;
  imageUrl?: string;
  source: 'Open Food Facts';
};

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const readMacro = (nutriments: Record<string, unknown> | undefined, keys: string[]) => {
  if (!nutriments) return 0;

  for (const key of keys) {
    const value = toNumber(nutriments[key]);
    if (value > 0) return value;
  }

  return 0;
};

const roundMacro = (value: number) => Math.max(0, Math.round(value));

const normalizeProduct = (product: OpenFoodFactsProduct, index: number): FoodLookupResult | null => {
  const name = product.product_name?.trim();
  const nutriments = product.nutriments;

  if (!name || !nutriments) return null;

  const calories = readMacro(nutriments, ['energy-kcal_serving', 'energy-kcal', 'energy-kcal_100g']);
  const protein = readMacro(nutriments, ['proteins_serving', 'proteins', 'proteins_100g']);
  const carbs = readMacro(nutriments, ['carbohydrates_serving', 'carbohydrates', 'carbohydrates_100g']);
  const fat = readMacro(nutriments, ['fat_serving', 'fat', 'fat_100g']);

  if (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) return null;

  return {
    id: `${name}-${index}`,
    name,
    calories: roundMacro(calories),
    protein: roundMacro(protein),
    carbs: roundMacro(carbs),
    fat: roundMacro(fat),
    quantity: product.serving_size || product.quantity,
    imageUrl: product.image_front_small_url,
    source: 'Open Food Facts',
  };
};

export const lookupFoodNutrition = async (query: string): Promise<FoodLookupResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    search_terms: trimmed,
    page_size: '6',
    fields: 'product_name,quantity,serving_size,image_front_small_url,nutriments',
  });

  const response = await fetch(`${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Food lookup failed.');
  }

  const data = (await response.json()) as OpenFoodFactsSearchResponse;
  return (data.products ?? []).map(normalizeProduct).filter((item): item is FoodLookupResult => Boolean(item));
};
