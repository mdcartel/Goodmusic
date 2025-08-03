/**
 * Simple fuzzy search implementation for better search results
 */

export interface FuzzySearchOptions {
  threshold?: number; // Minimum score threshold (0-1)
  includeScore?: boolean; // Include score in results
  keys?: string[]; // Keys to search in for objects
  caseSensitive?: boolean;
}

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches?: Array<{
    key: string;
    value: string;
    indices: number[][];
  }>;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1, higher is better)
 */
function calculateSimilarity(str1: string, str2: string, caseSensitive = false): number {
  if (!caseSensitive) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
  }

  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // Exact substring match gets high score
  if (str1.includes(str2) || str2.includes(str1)) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length <= str2.length ? str1 : str2;
    return shorter.length / longer.length * 0.9; // Slightly less than perfect match
  }

  // Use Levenshtein distance for fuzzy matching
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

/**
 * Find matching indices for highlighting
 */
function findMatchIndices(text: string, pattern: string, caseSensitive = false): number[][] {
  const indices: number[][] = [];
  
  if (!caseSensitive) {
    text = text.toLowerCase();
    pattern = pattern.toLowerCase();
  }

  let startIndex = 0;
  let index = text.indexOf(pattern, startIndex);
  
  while (index !== -1) {
    indices.push([index, index + pattern.length - 1]);
    startIndex = index + 1;
    index = text.indexOf(pattern, startIndex);
  }

  return indices;
}

/**
 * Search for pattern in text with fuzzy matching
 */
function searchInText(text: string, pattern: string, options: FuzzySearchOptions = {}): {
  score: number;
  indices: number[][];
} {
  const { caseSensitive = false } = options;
  
  // Calculate similarity score
  const score = calculateSimilarity(text, pattern, caseSensitive);
  
  // Find exact match indices for highlighting
  const indices = findMatchIndices(text, pattern, caseSensitive);
  
  return { score, indices };
}

/**
 * Perform fuzzy search on an array of items
 */
export function fuzzySearch<T>(
  items: T[],
  pattern: string,
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  const {
    threshold = 0.3,
    includeScore = false,
    keys = [],
    caseSensitive = false
  } = options;

  if (!pattern.trim()) {
    return items.map(item => ({ item, score: 1 }));
  }

  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    let bestScore = 0;
    const matches: Array<{
      key: string;
      value: string;
      indices: number[][];
    }> = [];

    if (typeof item === 'string') {
      // Simple string search
      const result = searchInText(item, pattern, { caseSensitive });
      bestScore = result.score;
      
      if (includeScore) {
        matches.push({
          key: 'value',
          value: item,
          indices: result.indices
        });
      }
    } else if (typeof item === 'object' && item !== null) {
      // Object search using specified keys
      const searchKeys = keys.length > 0 ? keys : Object.keys(item as any);
      
      for (const key of searchKeys) {
        const value = (item as any)[key];
        if (typeof value === 'string') {
          const result = searchInText(value, pattern, { caseSensitive });
          
          if (result.score > bestScore) {
            bestScore = result.score;
          }
          
          if (includeScore && result.score > threshold) {
            matches.push({
              key,
              value,
              indices: result.indices
            });
          }
        }
      }
    }

    if (bestScore >= threshold) {
      const result: FuzzySearchResult<T> = { item, score: bestScore };
      
      if (includeScore && matches.length > 0) {
        result.matches = matches;
      }
      
      results.push(result);
    }
  }

  // Sort by score (descending)
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Highlight matching text in a string
 */
export function highlightMatches(
  text: string,
  pattern: string,
  options: {
    caseSensitive?: boolean;
    highlightTag?: string;
    highlightClass?: string;
  } = {}
): string {
  const {
    caseSensitive = false,
    highlightTag = 'mark',
    highlightClass = 'highlight'
  } = options;

  if (!pattern.trim()) return text;

  const indices = findMatchIndices(text, pattern, caseSensitive);
  
  if (indices.length === 0) return text;

  let result = '';
  let lastIndex = 0;

  for (const [start, end] of indices) {
    // Add text before match
    result += text.slice(lastIndex, start);
    
    // Add highlighted match
    const matchText = text.slice(start, end + 1);
    result += `<${highlightTag} class="${highlightClass}">${matchText}</${highlightTag}>`;
    
    lastIndex = end + 1;
  }

  // Add remaining text
  result += text.slice(lastIndex);

  return result;
}

/**
 * Create a search index for better performance with large datasets
 */
export class SearchIndex<T> {
  private items: T[] = [];
  private index: Map<string, Set<number>> = new Map();
  private keys: string[] = [];

  constructor(items: T[] = [], keys: string[] = []) {
    this.keys = keys;
    this.buildIndex(items);
  }

  private buildIndex(items: T[]): void {
    this.items = items;
    this.index.clear();

    items.forEach((item, itemIndex) => {
      const searchKeys = this.keys.length > 0 ? this.keys : Object.keys(item as any);
      
      for (const key of searchKeys) {
        const value = (item as any)[key];
        if (typeof value === 'string') {
          // Create n-grams for better fuzzy matching
          const words = value.toLowerCase().split(/\s+/);
          
          for (const word of words) {
            // Add full word
            if (!this.index.has(word)) {
              this.index.set(word, new Set());
            }
            this.index.get(word)!.add(itemIndex);
            
            // Add prefixes for partial matching
            for (let i = 1; i <= word.length; i++) {
              const prefix = word.slice(0, i);
              if (!this.index.has(prefix)) {
                this.index.set(prefix, new Set());
              }
              this.index.get(prefix)!.add(itemIndex);
            }
          }
        }
      }
    });
  }

  search(pattern: string, options: FuzzySearchOptions = {}): FuzzySearchResult<T>[] {
    const { threshold = 0.3 } = options;
    
    if (!pattern.trim()) {
      return this.items.map(item => ({ item, score: 1 }));
    }

    // Get candidate items from index
    const candidateIndices = new Set<number>();
    const searchTerms = pattern.toLowerCase().split(/\s+/);
    
    for (const term of searchTerms) {
      const matches = this.index.get(term);
      if (matches) {
        matches.forEach(index => candidateIndices.add(index));
      }
    }

    // If no candidates found in index, fall back to full search
    const candidates = candidateIndices.size > 0 
      ? Array.from(candidateIndices).map(i => this.items[i])
      : this.items;

    return fuzzySearch(candidates, pattern, options);
  }

  addItems(items: T[]): void {
    this.buildIndex([...this.items, ...items]);
  }

  updateItems(items: T[]): void {
    this.buildIndex(items);
  }

  clear(): void {
    this.items = [];
    this.index.clear();
  }
}