import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Tag } from 'lucide-react';
import { RawMasterItem } from '../../types';

export interface RawSelectOption {
  id: number | string;
  name: string;
  category?: string;
  uom?: string;
  rate?: number;
  subtitle?: string;
  group?: string;
  badge?: string;
}

export interface SearchableRawSelectProps {
  value: number | string;
  onChange: (value: any, option?: RawSelectOption) => void;
  options?: RawSelectOption[];
  rawItems?: RawMasterItem[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  displayFormat?: 'name' | 'name-category' | 'full';
  disabled?: boolean;
}

const MAX_RENDERED = 60;

export const SearchableRawSelect: React.FC<SearchableRawSelectProps> = ({
  value,
  onChange,
  options,
  rawItems,
  placeholder = 'Select raw material...',
  className = '',
  buttonClassName = '',
  displayFormat = 'name-category',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options from either options prop or rawItems prop
  const allOptions = useMemo<RawSelectOption[]>(() => {
    if (options && options.length > 0) return options;
    if (rawItems && rawItems.length > 0) {
      return rawItems.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        uom: m.uom,
        rate: m.defaultRate,
      }));
    }
    return [];
  }, [options, rawItems]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return allOptions.find(
      o => String(o.id) === String(value) || o.name.trim().toLowerCase() === String(value).trim().toLowerCase()
    );
  }, [allOptions, value]);

  // Compute display label for button
  const displayLabel = useMemo(() => {
    if (!selectedOption) {
      // If value is truthy but not found in options yet, display value
      return value ? String(value) : placeholder;
    }
    if (displayFormat === 'full') {
      const parts = [selectedOption.name];
      if (selectedOption.category) parts.push(`(${selectedOption.category})`);
      if (selectedOption.rate !== undefined) {
        parts.push(`- ৳${selectedOption.rate}${selectedOption.uom ? `/${selectedOption.uom}` : ''}`);
      }
      return parts.join(' ');
    }
    if (displayFormat === 'name') {
      return selectedOption.name;
    }
    // 'name-category'
    return selectedOption.category
      ? `${selectedOption.name} (${selectedOption.category})`
      : selectedOption.name;
  }, [selectedOption, value, displayFormat, placeholder]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allOptions;

    return allOptions.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const catMatch = item.category ? item.category.toLowerCase().includes(q) : false;
      const uomMatch = item.uom ? item.uom.toLowerCase().includes(q) : false;
      const subtitleMatch = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
      const groupMatch = item.group ? item.group.toLowerCase().includes(q) : false;
      const idMatch = String(item.id).toLowerCase().includes(q);

      return nameMatch || catMatch || uomMatch || subtitleMatch || groupMatch || idMatch;
    });
  }, [allOptions, searchQuery]);

  // Limit rendered items for performance
  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, MAX_RENDERED);
  }, [filteredOptions]);

  // Group visible options if group exists
  const groupedSections = useMemo(() => {
    const hasGroups = visibleOptions.some(o => !!o.group);
    if (!hasGroups) {
      return [{ group: null, items: visibleOptions }];
    }

    const groupsMap = new Map<string, RawSelectOption[]>();
    visibleOptions.forEach(opt => {
      const g = opt.group || 'Other Items';
      if (!groupsMap.has(g)) {
        groupsMap.set(g, []);
      }
      groupsMap.get(g)!.push(opt);
    });

    return Array.from(groupsMap.entries()).map(([group, items]) => ({
      group,
      items,
    }));
  }, [visibleOptions]);

  // Calculate coordinates for portal popover
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverMaxHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverMaxHeight && rect.top > spaceBelow;

    const width = Math.max(rect.width, 360);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left,
      width,
      placeAbove,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setSearchQuery('');
    setFocusedIndex(-1);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleSelect = (option: RawSelectOption) => {
    onChange(option.id, option);
    handleClose();
    triggerRef.current?.focus();
  };

  // Keep popover aligned on window scroll / resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      // Small timeout ensures portal DOM element is mounted
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = prev + 1;
        return next >= visibleOptions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = prev - 1;
        return next < 0 ? visibleOptions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < visibleOptions.length) {
        handleSelect(visibleOptions[focusedIndex]);
      } else if (visibleOptions.length > 0) {
        handleSelect(visibleOptions[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedEl = listRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (focusedEl) {
        focusedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Global index counter for visible options across groups
  let itemCounter = 0;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (isOpen) handleClose();
          else handleOpen();
        }}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-left hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'ring-2 ring-amber-500 border-amber-500' : ''
        } ${buttonClassName}`}
        title={displayLabel}
      >
        <span className="truncate flex-1 font-semibold">
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-amber-600' : ''
          }`}
        />
      </button>

      {/* Floating Popover mounted via Portal */}
      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? undefined : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Input Bar */}
            <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type item name (English / বাংলা) or category..."
                className="w-full bg-transparent border-none text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status / Item count bar */}
            <div className="px-3 py-1 bg-slate-100/80 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>
                {filteredOptions.length === allOptions.length
                  ? `${allOptions.length} raw materials available`
                  : `${filteredOptions.length} matching items found`}
              </span>
              {filteredOptions.length > MAX_RENDERED && (
                <span className="text-amber-600 font-semibold">
                  Showing top {MAX_RENDERED}
                </span>
              )}
            </div>

            {/* Options List */}
            <div ref={listRef} className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
              {visibleOptions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No raw materials found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    No results for &ldquo;{searchQuery}&rdquo;. Try another name or category.
                  </p>
                </div>
              ) : (
                groupedSections.map((sec, secIdx) => (
                  <div key={secIdx} className="py-0.5">
                    {sec.group && (
                      <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/70 rounded">
                        {sec.group}
                      </div>
                    )}
                    <div className="space-y-0.5 mt-0.5">
                      {sec.items.map(opt => {
                        const currentIndex = itemCounter++;
                        const isSelected =
                          String(opt.id) === String(value) ||
                          opt.name.trim().toLowerCase() === String(value).trim().toLowerCase();
                        const isFocused = currentIndex === focusedIndex;

                        return (
                          <div
                            key={`${opt.id}-${currentIndex}`}
                            data-index={currentIndex}
                            onClick={() => handleSelect(opt)}
                            onMouseEnter={() => setFocusedIndex(currentIndex)}
                            className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200'
                                : isFocused
                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                : 'text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">
                                  {opt.name}
                                </span>
                                {opt.badge && (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                    {opt.badge}
                                  </span>
                                )}
                                {opt.category && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                                    <Tag className="w-2.5 h-2.5" />
                                    {opt.category}
                                  </span>
                                )}
                              </div>
                              {(opt.subtitle || opt.rate !== undefined) && (
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                  {opt.rate !== undefined && (
                                    <span className="font-semibold text-slate-700">
                                      Rate: ৳{opt.rate.toLocaleString()}{opt.uom ? `/${opt.uom}` : ''}
                                    </span>
                                  )}
                                  {opt.subtitle && (
                                    <span className="text-slate-400">({opt.subtitle})</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center gap-1">
                              {isSelected && (
                                <Check className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer notice when results are capped */}
            {filteredOptions.length > MAX_RENDERED && (
              <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100 text-[10px] text-amber-800 text-center font-semibold">
                Showing top {MAX_RENDERED} of {filteredOptions.length} items. Keep typing to refine results...
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
