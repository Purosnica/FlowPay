"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input, InputProps } from "./input";
import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  value: string | number;
  label: string;
  subtitle?: string;
}

export interface AutocompleteInputProps extends Omit<InputProps, "onChange" | "value"> {
  options: AutocompleteOption[];
  value?: string | number;
  onChange?: (value: string | number | null) => void;
  onSearch?: (query: string) => void;
  filterFn?: (option: AutocompleteOption, query: string) => boolean;
  loading?: boolean;
  maxResults?: number;
}

const defaultFilter = (option: AutocompleteOption, query: string): boolean => {
  const search = query.toLowerCase();
  return (
    option.label.toLowerCase().includes(search) ||
    !!(option.subtitle && option.subtitle.toLowerCase().includes(search))
  );
};

export function AutocompleteInput({
  options,
  value,
  onChange,
  onSearch,
  filterFn = defaultFilter,
  loading = false,
  maxResults = 10,
  className,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Encontrar la opción seleccionada por valor
  const selectedOption = options.find((opt) => opt.value === value);

  // Filtrar opciones
  const filteredOptions = options
    .filter((option) => {
      if (!inputValue) return true;
      return filterFn(option, inputValue);
    })
    .slice(0, maxResults);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll a item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex]);

  // Sincronizar inputValue con value
  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else if (!value) {
      setInputValue("");
    }
  }, [value, selectedOption]);

  // Notificar búsqueda
  useEffect(() => {
    if (onSearch && inputValue) {
      onSearch(inputValue);
    }
  }, [inputValue, onSearch]);

  const handleSelect = useCallback(
    (option: AutocompleteOption) => {
      setInputValue(option.label);
      onChange?.(option.value);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        {...props}
        className={cn(className)}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
          if (!e.target.value) {
            onChange?.(null);
          }
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {isOpen && (filteredOptions.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500">Buscando...</div>
          ) : (
            <ul ref={listRef} className="max-h-60 overflow-auto p-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded px-3 py-2 text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-primary text-white"
                      : "hover:bg-gray-50 dark:hover:bg-dark-3"
                  )}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.subtitle && (
                    <div
                      className={cn(
                        "text-xs",
                        index === highlightedIndex ? "text-white/80" : "text-gray-500"
                      )}
                    >
                      {option.subtitle}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}



