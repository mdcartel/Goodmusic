'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, TrendingUp, Music, User, List, X } from 'lucide-react';
import { useYouTubeSearchSuggestions } from '@/lib/hooks/useYouTubeSearch';
import { debounce } from '@/lib/utils';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

interface SuggestionItem {
  id: string;
  text: string;
  type: 'history' | 'suggestion' | 'trending' | 'artist' | 'album';
  icon: React.ComponentType<{ className?: string }>;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = "Search for music, artists, albums...",
  className = ''
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search suggestions
  const debouncedValue = useCallback(
    debounce((searchValue: string) => searchValue, 300),
    []
  );

  const { data: suggestionsData } = useYouTubeSearchSuggestions(
    debouncedValue(value),
    value.length >= 2 && isOpen
  );

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('search-autocomplete-history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('search-autocomplete-history', JSON.stringify(newHistory));
  };

  // Generate suggestions list
  const suggestions: SuggestionItem[] = React.useMemo(() => {
    const items: SuggestionItem[] = [];
    
    // Add search history if no current input or input matches history
    if (value.length === 0 || searchHistory.some(item => 
      item.toLowerCase().includes(value.toLowerCase())
    )) {
      searchHistory
        .filter(item => value.length === 0 || item.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 3)
        .forEach(item => {
          items.push({
            id: `history-${item}`,
            text: item,
            type: 'history',
            icon: Clock
          });
        });
    }

    // Add API suggestions
    if (suggestionsData?.suggestions) {
      suggestionsData.suggestions.slice(0, 5).forEach(suggestion => {
        items.push({
          id: `suggestion-${suggestion}`,
          text: suggestion,
          type: 'suggestion',
          icon: Search
        });
      });
    }

    // Add trending suggestions if no input
    if (value.length === 0) {
      getTrendingSuggestions().forEach(trending => {
        items.push({
          id: `trending-${trending}`,
          text: trending,
          type: 'trending',
          icon: TrendingUp
        });
      });
    }

    // Add contextual suggestions based on input
    if (value.length > 0) {
      getContextualSuggestions(value).forEach(contextual => {
        items.push({
          id: `contextual-${contextual.text}`,
          text: contextual.text,
          type: contextual.type,
          icon: contextual.icon
        });
      });
    }

    return items;
  }, [value, searchHistory, suggestionsData]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    setIsOpen(true);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => setIsOpen(false), 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && value.trim()) {
        handleSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex].text);
        } else if (value.trim()) {
          handleSearch(value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    handleSearch(suggestion);
  };

  // Handle search
  const handleSearch = (query: string) => {
    if (query.trim()) {
      saveToHistory(query.trim());
      onSearch(query.trim());
      setIsOpen(false);
    }
  };

  // Clear input
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 
                     hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
                   border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg 
                   max-h-80 overflow-y-auto z-50"
        >
          {/* Group suggestions by type */}
          {renderSuggestionGroups(suggestions, selectedIndex, handleSuggestionSelect)}
        </div>
      )}
    </div>
  );
}

// Helper function to render suggestion groups
function renderSuggestionGroups(
  suggestions: SuggestionItem[],
  selectedIndex: number,
  onSelect: (text: string) => void
) {
  const groups = suggestions.reduce((acc, suggestion, index) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push({ ...suggestion, originalIndex: index });
    return acc;
  }, {} as Record<string, (SuggestionItem & { originalIndex: number })[]>);

  const groupOrder = ['history', 'suggestion', 'trending', 'artist', 'album'];
  const groupLabels = {
    history: 'Recent searches',
    suggestion: 'Suggestions',
    trending: 'Trending',
    artist: 'Artists',
    album: 'Albums'
  };

  return (
    <div>
      {groupOrder.map(groupType => {
        const groupItems = groups[groupType];
        if (!groupItems || groupItems.length === 0) return null;

        return (
          <div key={groupType}>
            {/* Group Header */}
            <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 
                          bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
              {groupLabels[groupType as keyof typeof groupLabels]}
            </div>
            
            {/* Group Items */}
            {groupItems.map(({ text, icon: Icon, originalIndex }) => (
              <button
                key={`${groupType}-${text}`}
                onClick={() => onSelect(text)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 
                          transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedIndex === originalIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Helper function to get trending suggestions
function getTrendingSuggestions(): string[] {
  return [
    'trending music 2024',
    'top hits this week',
    'viral songs',
    'new releases',
    'popular artists'
  ];
}

// Helper function to get contextual suggestions
function getContextualSuggestions(input: string): Array<{
  text: string;
  type: 'artist' | 'album';
  icon: React.ComponentType<{ className?: string }>;
}> {
  const suggestions = [];
  
  // Artist suggestions
  if (input.toLowerCase().includes('artist') || input.toLowerCase().includes('singer')) {
    suggestions.push({
      text: `${input} songs`,
      type: 'artist' as const,
      icon: User
    });
  }
  
  // Album suggestions
  if (input.toLowerCase().includes('album') || input.toLowerCase().includes('ep')) {
    suggestions.push({
      text: `${input} full album`,
      type: 'album' as const,
      icon: List
    });
  }
  
  // Generic music suggestions
  suggestions.push({
    text: `${input} music`,
    type: 'artist' as const,
    icon: Music
  });
  
  return suggestions.slice(0, 3);
}