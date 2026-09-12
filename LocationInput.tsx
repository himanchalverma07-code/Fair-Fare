"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Circle, Loader2, X } from "lucide-react";
import { searchPlaces, type GeoPoint } from "@/lib/geo";

interface LocationInputProps {
  label: string;
  placeholder: string;
  icon: "start" | "end";
  value: GeoPoint | null;
  onSelect: (point: GeoPoint | null) => void;
}

export default function LocationInput({
  label,
  placeholder,
  icon,
  value,
  onSelect,
}: LocationInputProps) {
  const [query, setQuery] = useState(value?.displayName ?? "");
  const [suggestions, setSuggestions] = useState<GeoPoint[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value?.displayName ?? "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(text: string) {
    setQuery(text);
    setIsOpen(true);

    if (value && text !== value.displayName) {
      onSelect(null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }

  function handleSelect(point: GeoPoint) {
    onSelect(point);
    setQuery(point.displayName);
    setSuggestions([]);
    setIsOpen(false);
  }

  function handleClear() {
    setQuery("");
    onSelect(null);
    setSuggestions([]);
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-2xl border-2 bg-white px-3.5 py-3 transition-colors ${
          isOpen ? "border-brand-500" : "border-ink-100"
        }`}
      >
        {icon === "start" ? (
          <Circle size={16} className="shrink-0 fill-emerald-500 text-emerald-500" />
        ) : (
          <MapPin size={18} className="shrink-0 text-brand-600" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink-900 placeholder:text-ink-500 placeholder:font-normal focus:outline-none"
        />
        {isLoading && <Loader2 size={16} className="animate-spin text-ink-500" />}
        {!isLoading && query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear location"
            className="shrink-0 rounded-full p-0.5 text-ink-500 hover:bg-ink-100"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="thin-scroll animate-fade-in absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-ink-100 bg-white shadow-floating">
          {suggestions.map((point, i) => (
            <button
              key={`${point.lat}-${point.lng}-${i}`}
              type="button"
              onClick={() => handleSelect(point)}
              className="flex w-full items-start gap-2.5 border-b border-ink-100 px-4 py-3 text-left last:border-b-0 hover:bg-brand-50 active:bg-brand-100"
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-ink-500" />
              <span className="text-sm text-ink-800">{point.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen &&
        !isLoading &&
        query.trim().length >= 3 &&
        suggestions.length === 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-ink-100 bg-white p-4 text-center text-sm text-ink-500 shadow-floating">
            No matches found. Try a nearby landmark.
          </div>
        )}
    </div>
  );
}
