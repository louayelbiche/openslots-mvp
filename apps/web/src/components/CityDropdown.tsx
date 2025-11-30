'use client';

import { useState, useRef, useEffect } from 'react';

export interface City {
  value: string;
  label: string;
  country: string;
}

// Available cities
export const CITIES: City[] = [
  { value: 'new-york', label: 'New York City', country: 'New York' },
  { value: 'bali', label: 'Bali', country: 'Indonesia' },
];

interface CityDropdownProps {
  value: string;
  onChange: (city: string) => void;
  error?: string;
  placeholder?: string;
}

export function CityDropdown({
  value,
  onChange,
  error,
  placeholder = 'Search for a city...',
}: CityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the selected city object
  const selectedCity = CITIES.find((c) => c.value === value);

  // Filter cities based on search term
  const filteredCities = CITIES.filter(
    (city) =>
      city.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const handleSelect = (city: City) => {
    onChange(city.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCities[highlightedIndex]) {
          handleSelect(filteredCities[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <label htmlFor="city-search" className="sr-only">
        City
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="city-search"
          type="text"
          placeholder={selectedCity ? selectedCity.label : placeholder}
          value={isOpen ? searchTerm : selectedCity?.label || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={`
            w-full px-4 py-3 pr-10 rounded-xl border-2 text-sm
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent
            ${error ? 'border-orange-400' : 'border-slate-200'}
            ${selectedCity && !isOpen ? 'text-slate-900' : ''}
          `}
          aria-describedby={error ? 'city-error' : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p id="city-error" className="mt-1 text-xs text-orange-600">
          {error}
        </p>
      )}

      {/* Dropdown list */}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {filteredCities.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              No cities found
            </li>
          ) : (
            filteredCities.map((city, index) => (
              <li
                key={city.value}
                role="option"
                aria-selected={value === city.value}
                onClick={() => handleSelect(city)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  px-4 py-3 cursor-pointer text-sm transition-colors
                  ${highlightedIndex === index ? 'bg-slate-100' : ''}
                  ${value === city.value ? 'bg-slate-900 text-white' : 'text-slate-900'}
                  ${value === city.value && highlightedIndex === index ? 'bg-slate-800' : ''}
                  first:rounded-t-lg last:rounded-b-lg
                `}
              >
                <span className="font-medium">{city.label}</span>
                <span className={`ml-2 ${value === city.value ? 'text-slate-300' : 'text-slate-500'}`}>
                  {city.country}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
