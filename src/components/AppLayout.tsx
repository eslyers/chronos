"use client";
import React, { useState } from "react";
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
} from "lucide-react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useGlobal();

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

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-muted/30">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border shadow-sm transform transition-transform duration-200 ease-in-out z-40
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link href="/app" className="flex items-center gap-2">
            <span className="text-2xl">🕐</span>
            <span className="text-lg font-bold tracking-tight">{productName}</span>
          </Link>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 px-2 space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>🕐</span>
            <span>{productName} v0.1</span>
          </div>
        </div>
      </aside>

      {/* Main wrapper */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 bg-background/95 backdrop-blur border-b border-border px-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

          <div className="relative">
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
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserDropdownOpen(false)}
                />
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
              </>
            )}
          </div>
          </div>
        </header>

        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
