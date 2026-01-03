import React, { useState, useEffect, useRef } from "react";
import { getCategories } from "../lib/api";

export default function CategoryAutocomplete({ 
  value, 
  onChange, 
  budgetId, 
  type, 
  placeholder, 
  className 
}) {
  const [suggestions, setSuggestions] = useState([]); // ✅ Inicjalizuj jako pusta tablica
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef(null);
  const wrapperRef = useRef(null);

  // Zamknij dropdown po kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  async function fetchSuggestions(searchText) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const sanitizedSearch = searchText.trim().slice(0, 50);
      // Only allow letters, numbers, spaces, and basic punctuation
      if (!sanitizedSearch || sanitizedSearch.length < 2 || !/^[\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ.,-]*$/.test(sanitizedSearch)) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!budgetId) {
        console.warn("CategoryAutocomplete: brak budgetId");
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await getCategories(budgetId, type, sanitizedSearch, 10);
        if (error) throw error;
        if (!data) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        const uniqueCategories = [...new Set(data.map((item) => item.category))];

        setSuggestions(uniqueCategories);
        setShowSuggestions(uniqueCategories.length > 0);
      } catch (error) {
        console.error("Błąd pobierania sugestii:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleInputChange(e) {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.trim().length >= 2) {
      fetchSuggestions(newValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function handleSuggestionClick(suggestion) {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value || ""} // ✅ Fallback do pustego stringa
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder || "Wpisz kategorię..."}
        className={className || "w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-blue-500"}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* Dropdown sugestii */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-dark-card border border-dark-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 hover:bg-dark-hover cursor-pointer text-white transition-colors"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}