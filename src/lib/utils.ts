import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Auto-categorization logic based on keywords
 */
export function autoCategorize(title: string): string {
  const keywords: Record<string, string[]> = {
    'Food': ['restaurant', 'cafe', 'pizza', 'burger', 'grocery', 'supermarket', 'starbucks', 'uber eats', 'doordash', 'mcdonalds'],
    'Transport': ['uber', 'lyft', 'gas', 'fuel', 'train', 'bus', 'metro', 'parking', 'garage'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'game', 'steam', 'concert', 'theatre'],
    'Shopping': ['amazon', 'walmart', 'target', 'ebay', 'clothing', 'mall', 'store'],
    'Health': ['pharmacy', 'doctor', 'hospital', 'gym', 'fitness', 'medical'],
    'Bills': ['rent', 'electricity', 'water', 'internet', 'phone', 'insurance', 'subscription'],
    'Other': []
  };

  const lowerTitle = title.toLowerCase();
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerTitle.includes(word))) {
      return category;
    }
  }
  return 'Other';
}
