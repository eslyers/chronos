"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
} from "lucide-react";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";

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

  // Data selecionada (meia-noite local, sem deslocamento de fuso)
  const selectedDate = useMemo(() => parseDateOnly(value), [value]);

  // Calendar navigation month/year view state
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  // Keep viewDate updated when value changes externally
  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

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
    onChange(formatDateOnly(dayDate));
    setOpen(false);
  };

  const handleSelectToday = () => {
    handleSelectDay(new Date());
  };

  const handleClear = () => {
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

  // Popover do Radix: entra na pilha de camadas (Esc e clique fora fecham só o
  // calendário, não o Dialog que o contém) e recebe pointer-events mesmo com o
  // body bloqueado por um Dialog modal.
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverPrimitive.Anchor asChild>
        <div
          className={`
            group relative flex h-11 w-full items-center justify-between rounded-xl border border-input
            bg-background text-sm transition-all duration-200
            ${open ? "ring-2 ring-blue-500 border-blue-500 shadow-md" : "hover:border-blue-500/60 focus-within:border-blue-500"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${className}
          `}
        >
          {/* Gatilho: botão real (o "limpar" fica ao lado, nunca aninhado) */}
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              id={id}
              disabled={disabled}
              aria-haspopup="dialog"
              className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-xl pl-3.5 pr-2 py-2 text-left cursor-pointer focus:outline-none disabled:cursor-not-allowed"
            >
              <CalendarIcon
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 transition-colors ${displayText ? "text-blue-500" : "text-muted-foreground group-hover:text-blue-500"}`}
              />
              <span className={`truncate font-medium ${displayText ? "text-foreground font-semibold" : "text-muted-foreground/70"}`}>
                {displayText || placeholder}
              </span>
            </button>
          </PopoverPrimitive.Trigger>

          {displayText && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="mr-2.5 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Limpar data"
              aria-label="Limpar data"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Clock aria-hidden="true" className="mr-3.5 h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          )}
        </div>
      </PopoverPrimitive.Anchor>

      {/* Popover Calendar em Portal no Body (acima de Dialogs e Selects) */}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          // Esc fecha só o calendário: não deixa o evento chegar a listeners de janela
          onEscapeKeyDown={(e) => e.stopPropagation()}
          style={{ zIndex: 100000 }}
          className="w-[310px] sm:w-[320px] rounded-2xl border border-border bg-card p-4 shadow-2xl animate-fadeIn select-none focus:outline-none"
          aria-label="Calendário"
        >
          {/* Header Mês / Ano */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Mês anterior"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-sm font-bold text-foreground" aria-live="polite">
              {MONTH_NAMES[viewMonth]} <span className="text-blue-500">{viewYear}</span>
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Próximo mês"
              aria-label="Próximo mês"
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
                  aria-pressed={item.isSelected}
                  aria-label={item.date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
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
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
