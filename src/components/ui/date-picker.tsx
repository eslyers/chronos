"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
} from "lucide-react";

interface DatePickerProps {
  value?: string | null; // ISO string or YYYY-MM-DD
  onChange: (dateStr: string) => void; // returns YYYY-MM-DD or ""
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  id,
  disabled = false,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parsed selected date
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const clean = value.split("T")[0];
    const parts = clean.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(year, month, day);
  }, [value]);

  // Calendar navigation month/year view state
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  // Keep viewDate updated when value changes externally
  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  // Posicionamento inteligente com trava absoluta dentro do Viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 310;
    const popoverHeight = 330;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + 6;

    // Se o calendário estouraria o final da tela ao abrir abaixo...
    if (top + popoverHeight > viewportHeight - 12) {
      const topAbove = rect.top - popoverHeight - 6;
      // Tenta abrir acima do campo
      if (topAbove >= 12) {
        top = topAbove;
      } else {
        // Se a tela for pequena, fixa dentro dos limites visíveis do viewport
        top = Math.max(12, viewportHeight - popoverHeight - 12);
      }
    }

    let left = rect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popoverWidth - 12);
    }

    setPopoverPos({ top, left });
  }, []);

  // Rola o campo para visualização e calcula posição ao abrir
  useEffect(() => {
    if (!open) return;
    if (triggerRef.current) {
      triggerRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, updatePosition]);

  // Click outside protegido contra cliques em scrollbars de modals
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Element;
      if (!target) return;

      // Se o clique foi no gatilho ou dentro do calendário popover, ignora
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      // Se o clique foi em uma barra de rolagem (ex: da modal), ignora para não fechar
      const isWindowScrollbar = e.clientX >= document.documentElement.clientWidth || e.clientY >= document.documentElement.clientHeight;
      if (isWindowScrollbar) return;

      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Key listener para Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Formatação de exibição (dd/mm/yyyy)
  const displayText = useMemo(() => {
    if (!selectedDate) return "";
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const y = selectedDate.getFullYear();
    return `${d}/${m}/${y}`;
  }, [selectedDate]);

  // NAVEGAÇÃO DE DATA
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (dayDate: Date) => {
    const y = dayDate.getFullYear();
    const m = String(dayDate.getMonth() + 1).padStart(2, "0");
    const d = String(dayDate.getDate()).padStart(2, "0");
    const isoDateStr = `${y}-${m}-${d}`;
    onChange(isoDateStr);
    setOpen(false);
  };

  const handleSelectToday = () => {
    handleSelectDay(new Date());
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  // Grade de dias do calendário
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const startWeekday = firstDayOfMonth.getDay();
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const today = new Date();

    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
      });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: isSameDay(d, today),
        isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
      });
    }

    const nextDaysNeeded = 42 - days.length;
    for (let day = 1; day <= nextDaysNeeded; day++) {
      const d = new Date(viewYear, viewMonth + 1, day);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDate]);

  return (
    <div className="relative inline-block w-full">
      {/* Trigger Input / Button */}
      <div
        ref={triggerRef}
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className={`
          group flex h-11 w-full items-center justify-between rounded-xl border border-input
          bg-background px-3.5 py-2 text-sm transition-all duration-200 cursor-pointer
          ${open ? "ring-2 ring-blue-500 border-blue-500 shadow-md" : "hover:border-blue-500/60"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${className}
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className={`h-4 w-4 shrink-0 transition-colors ${displayText ? "text-blue-500" : "text-muted-foreground group-hover:text-blue-500"}`} />
          <span className={`truncate font-medium ${displayText ? "text-foreground font-semibold" : "text-muted-foreground/70"}`}>
            {displayText || placeholder}
          </span>
        </div>

        {displayText && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Limpar data"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        )}
      </div>

      {/* Popover Calendar em Portal no Body (com trava estrita de tela) */}
      {open && mounted && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            zIndex: 99999,
          }}
          className="w-[310px] sm:w-[320px] rounded-2xl border border-border bg-card p-4 shadow-2xl animate-fadeIn select-none"
        >
          {/* Header Mês / Ano */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-sm font-bold text-foreground">
              {MONTH_NAMES[viewMonth]} <span className="text-blue-500">{viewYear}</span>
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className="text-[11px] font-bold text-muted-foreground/70 uppercase">
                {name}
              </span>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, index) => {
              const dayNumber = item.date.getDate();
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectDay(item.date)}
                  className={`
                    h-9 w-9 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold
                    transition-all duration-150 relative
                    ${
                      item.isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold scale-105"
                        : item.isToday
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-500/40"
                        : item.isCurrentMonth
                        ? "text-foreground hover:bg-blue-500/15 hover:text-blue-600 dark:hover:text-blue-400"
                        : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  {dayNumber}
                  {item.isToday && !item.isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Rodapé de ações rápidas */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border text-xs font-medium">
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={handleSelectToday}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline px-2 py-1 rounded-md"
            >
              Hoje
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
