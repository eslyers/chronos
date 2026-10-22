"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  FolderKanban,
  Library,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  KeyRound,
  Clock,
  KanbanSquare,
  CalendarDays,
  History,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isWorkspaceAdmin, isMasterAdmin, signOut } = useGlobal();

  // Carregar preferência salva no localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) setIsCollapsed(saved === "true");
    } catch {
      // localStorage indisponível (modo privado/bloqueado)
    }
  }, []);

  // Breakpoint lg: no desktop a sidebar é fixa; abaixo disso é off-canvas
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Esc fecha a sidebar mobile
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileSidebarOpen]);

  // Off-canvas fechado fica fora da ordem de tabulação e da árvore de acessibilidade
  const isSidebarHidden = mounted && !isDesktop && !isMobileSidebarOpen;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {
        // localStorage indisponível
      }
      return next;
    });
  };

  const handleSettings = () => {
    router.push("/app/settings");
  };

  const getInitials = (email: string, name?: string | null) => {
    const cleanName = name?.trim();
    if (cleanName) {
      const parts = cleanName.split(/\s+/);
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    const parts = email.split("@")[0].split(/[._-]/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "CHRONOS";

  const navigation = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Projetos", href: "/app/projects", icon: FolderKanban },
    { name: "Fechamento (Fast Close)", href: "/app/fast-close", icon: CalendarClock },
    { name: "Cronograma", href: "/app/timeline", icon: Clock },
    { name: "Kanban", href: "/app/kanban", icon: KanbanSquare },
    { name: "Carga de Trabalho", href: "/app/workload", icon: Gauge },
    { name: "Calendário", href: "/app/calendar", icon: CalendarDays },
    { name: "Templates", href: "/app/templates", icon: Library },
    ...(isWorkspaceAdmin || isMasterAdmin
      ? [
          { name: "Usuários", href: "/app/users", icon: Users },
          { name: "Administração", href: "/app/admin", icon: ShieldCheck },
        ]
      : []),
    { name: "Notificações", href: "/app/notifications", icon: Bell },
    { name: "Atividades", href: "/app/activity", icon: History },
    { name: "Configurações", href: "/app/settings", icon: Settings },
  ];

  const sidebarWidth = isCollapsed ? "w-[60px]" : "w-64";
  const mainPadding = isCollapsed ? "lg:pl-[60px]" : "lg:pl-64";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        inert={isSidebarHidden}
        aria-hidden={isSidebarHidden || undefined}
        className={`
          fixed inset-y-0 left-0 bg-card border-r border-border shadow-sm z-40
          transform transition-all duration-300 ease-in-out
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${mounted ? sidebarWidth : "w-64"}
          overflow-hidden flex flex-col
        `}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border shrink-0">
          <Link
            href="/app"
            className="flex items-center gap-2 min-w-0 overflow-hidden"
            title={productName}
          >
            <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-blue-500/10 p-0.5">
              <Image src="/icon.svg" alt="CHRONOS Logo" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight truncate transition-opacity duration-200">
                {productName}
              </span>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground ml-auto shrink-0"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation — rola em telas baixas em vez de passar por baixo do rodapé */}
        <nav aria-label="Navegação principal" className="py-3 px-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
          {navigation.map((item) => {
            // Exact match for /app (dashboard) — avoids matching all /app/* sub-routes.
            // For all other items, also match sub-routes (e.g. /app/projects/[id]).
            const isActive =
              item.href === "/app"
                ? pathname === "/app"
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`
                  group relative flex items-center rounded-md transition-all duration-150
                  ${isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}
                  text-sm font-medium
                  ${
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon
                  className={`
                    shrink-0 h-5 w-5
                    ${isCollapsed ? "" : "mr-3"}
                    ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}
                  `}
                />
                {!isCollapsed && (
                  <span className="truncate transition-opacity duration-200">
                    {item.name}
                  </span>
                )}

                {/* Tooltip when collapsed */}
                {isCollapsed && (
                  <span className="
                    pointer-events-none absolute left-full ml-2.5 z-50
                    whitespace-nowrap rounded-md bg-popover border border-border
                    px-2.5 py-1 text-xs font-medium text-foreground shadow-md
                    opacity-0 group-hover:opacity-100 transition-opacity duration-150
                  ">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card">
          {/* Collapse toggle button — only on desktop */}
          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className={`
              hidden lg:flex items-center w-full
              ${isCollapsed ? "justify-center px-0 py-3" : "gap-2 px-4 py-3"}
              text-xs text-muted-foreground hover:text-foreground transition-colors
            `}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Recolher</span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-2 px-4 pb-3 text-xs text-muted-foreground">
              <span>🕐</span>
              <span>{productName} v0.1</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main wrapper */}
      <div className={`transition-all duration-300 ease-in-out ${mounted ? mainPadding : "lg:pl-64"}`}>
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 bg-background/95 backdrop-blur border-b border-border px-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle in header (only visible when collapsed, so user can expand from top) */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* Menu do usuário (Radix: Esc, setas, foco e aria-expanded) */}
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Menu do usuário"
                  className="flex items-center gap-2 text-sm rounded-full hover:bg-muted px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
                >
                  <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold text-foreground">
                    {user ? getInitials(user.email, user.name) : "??"}
                  </div>
                  <span className="hidden sm:inline text-foreground/80 font-medium">
                    {user?.name || user?.email || "Conectando..."}
                  </span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="w-64 bg-popover text-popover-foreground rounded-md shadow-lg border border-border z-40 focus:outline-none"
                >
                  <DropdownMenu.Label className="p-3 border-b border-border font-normal">
                    <p className="text-xs text-muted-foreground">Conectado como</p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.name || user?.email}
                    </p>
                    {user?.name && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </DropdownMenu.Label>
                  <DropdownMenu.Group className="p-1">
                    <DropdownMenu.Item
                      onSelect={handleSettings}
                      className="w-full flex items-center px-3 py-2 text-sm rounded-sm cursor-pointer outline-none hover:bg-muted data-[highlighted]:bg-muted"
                    >
                      <KeyRound className="mr-3 h-4 w-4 text-muted-foreground" />
                      Configurações
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => {
                        signOut();
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-destructive rounded-sm cursor-pointer outline-none hover:bg-destructive/10 data-[highlighted]:bg-destructive/10"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sair
                    </DropdownMenu.Item>
                  </DropdownMenu.Group>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
