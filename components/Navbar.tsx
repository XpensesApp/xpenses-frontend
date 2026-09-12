"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { CircleUserIcon, LogOutIcon, MenuIcon, SettingsIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Mis movimientos", href: "/" },
  { label: "Cuentas", href: "/accounts" },
  { label: "Suscripciones", href: "/subscriptions" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? null;

  return (
    <nav className="flex h-20 items-center gap-8 border-b bg-card px-4 shadow-sm sm:px-8">
      <Link href="/" className="text-2xl font-bold tracking-tight sm:text-3xl">
        Xpenses
      </Link>

      <div className="hidden flex-1 items-center gap-6 sm:flex">
        {navItems.map(item => (
          <NavLink key={item.href} href={item.href} active={pathname === item.href}>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <ThemeToggle />

        {userName && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {userName}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <CircleUserIcon className="size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userName ?? "Mi cuenta"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <SettingsIcon />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- redirect-only route handler, not a page; next/link's soft-navigation attempt fails on it and falls back to a reload anyway */}
              <a href="/api/auth/cognito-logout">
                <LogOutIcon />
                Cerrar sesión
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <MenuIcon className="size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {navItems.map(item => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-colors hover:text-foreground",
        active ? "font-medium text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </Link>
  );
}
