"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useGlobal();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar preferência salva no localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setIsCollapsed(saved === "true");
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleSettings = () => {
    router.push("/app/settings");
  };

  const getInitials = (email: string) => {
    const parts = email.split("@")[0].split(/[._-]/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "CHRONOS";

  const navigation = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Projetos", href: "/app/projects", icon: FolderKanban },
    { name: "Cronograma", href: "/app/timeline", icon: Clock },
    { name: "Kanban", href: "/app/kanban", icon: KanbanSquare },
    { name: "Calendário", href: "/app/calendar", icon: CalendarDays },
    { name: "Templates", href: "/app/templates", icon: Library },
    { name: "Equipe", href: "/app/users", icon: Users },
    { name: "Notificações", href: "/app/notifications", icon: Bell },
    { name: "Activity", href: "/app/activity", icon: History },
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
        className={`
          fixed inset-y-0 left-0 bg-card border-r border-border shadow-sm z-40
          transform transition-all duration-300 ease-in-out
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${mounted ? sidebarWidth : "w-64"}
          overflow-hidden
        `}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border shrink-0">
          <Link
            href="/app"
            className="flex items-center gap-2 min-w-0 overflow-hidden"
            title={productName}
          >
            <span className="text-2xl shrink-0">🕐</span>
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

        {/* Navigation */}
        <nav className="mt-3 px-2 space-y-0.5 flex-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
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
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card">
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

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 text-sm rounded-full hover:bg-muted px-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium">
                  {user ? getInitials(user.email) : "??"}
                </div>
                <span className="hidden sm:inline text-foreground/80">
                  {user?.email || "Conectando..."}
                </span>
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-popover rounded-md shadow-lg border border-border z-40">
                  <div className="p-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">Conectado como</p>
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleSettings();
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm rounded-sm hover:bg-muted"
                    >
                      <KeyRound className="mr-3 h-4 w-4 text-muted-foreground" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-destructive rounded-sm hover:bg-destructive/10"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
