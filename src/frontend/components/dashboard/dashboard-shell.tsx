"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ClipboardList,
  UtensilsCrossed,
  LayoutDashboard,
  BarChart3,
  LogOut,
  Menu as MenuIcon,
  X,
  Users,
  Sun,
  Moon,
  Sparkles,
  ExternalLink,
  QrCode,
  Wallet,
} from "lucide-react";
import { CafeQRModal } from "@/frontend/components/admin/cafe-qr-modal";

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        <Image src="/logo.png" alt="Scan&Pay logo" width={32} height={32} className="w-full h-full object-contain dark:invert" />
      </div>
      <span className="font-bold text-base tracking-tight text-foreground">
        Scan<span className="text-primary">&amp;</span>Pay
      </span>
    </div>
  );
}

import { cn } from "@/shared/utils/cn";
import { useState, useEffect } from "react";
import { useTheme } from "@/frontend/hooks/use-theme";
import type { UserRole } from "@/generated/prisma";

interface SidebarContentProps {
  user: { name: string; role: UserRole; email: string; cafeId: string | null };
  navigation: { name: string; href: string; icon: React.ElementType }[];
  isAdmin: boolean;
  cafeInfo: { name: string; slug: string } | null;
  dark: boolean;
  toggle: () => void;
  onClose: () => void;
  onQrOpen: () => void;
}

function SidebarContent({ user, navigation, isAdmin, cafeInfo, dark, toggle, onClose, onQrOpen }: SidebarContentProps) {
  const pathname = usePathname();
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border">
        <BrandMark />
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate text-foreground">{user.name}</p>
            <p className="text-[11px] text-muted truncate">{user.email}</p>
          </div>
        </div>
        <span className="inline-block mt-3 text-[10px] bg-primary/20 text-primary-light border border-primary/30 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">
          {user.role.replace("_", " ")}
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-0.5 flex-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-100",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <item.icon size={17} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Owner-only quick actions */}
      {!isAdmin && cafeInfo && (
        <div className="px-3 pb-2 space-y-2">
          <a
            href={`/${cafeInfo.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors w-full rounded-xl border border-border"
          >
            <ExternalLink size={16} />
            Customer View
          </a>
          <button
            onClick={onQrOpen}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors w-full rounded-xl border border-primary/20"
          >
            <QrCode size={16} />
            My QR Code
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-border/60">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted hover:text-danger hover:bg-danger/10 transition-colors w-full rounded-xl"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </>
  );
}

interface DashboardShellProps {
  user: { name: string; role: UserRole; email: string; cafeId: string | null };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const isAdmin = user.role === "SUPER_ADMIN";

  const [qrOpen, setQrOpen] = useState(false);
  const [cafeInfo, setCafeInfo] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    if (!isAdmin && user.cafeId) {
      fetch("/api/dashboard/cafe")
        .then((r) => r.json())
        .then((d) => { if (d.success) setCafeInfo(d.data); });
    }
  }, [isAdmin, user.cafeId]);

  const navigation = isAdmin
    ? [
        { name: "All Cafes",    href: "/admin",           icon: LayoutDashboard },
        { name: "All Orders",   href: "/admin/orders",    icon: ClipboardList },
        { name: "Menu",         href: "/admin/menu",      icon: UtensilsCrossed },
        { name: "Users",        href: "/admin/users",     icon: Users },
        { name: "Deep Insights",href: "/admin/insights",  icon: Sparkles },
      ]
    : [
        { name: "Orders",       href: "/dashboard",            icon: ClipboardList },
        { name: "Menu",         href: "/dashboard/menu",       icon: UtensilsCrossed },
        { name: "Analytics",    href: "/dashboard/analytics",  icon: BarChart3 },
        { name: "Deep Insights",href: "/dashboard/insights",   icon: Sparkles },
        { name: "Staff",        href: "/dashboard/staff",      icon: Users },
        { name: "Accounts",     href: "/dashboard/accounts",   icon: Wallet },
      ];

  return (
    <div className="dashboard-app min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-background border-b border-border sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
            <BrandMark />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="text-right">
              <p className="text-xs font-medium text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted">{user.role.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">

        {/* Desktop sidebar — sticky, always mounted, no GPU layer */}
        <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 sticky top-0 h-screen border-r border-border bg-background">
          <SidebarContent
            user={user}
            navigation={navigation}
            isAdmin={isAdmin}
            cafeInfo={cafeInfo}
            dark={dark}
            toggle={toggle}
            onClose={() => setSidebarOpen(false)}
            onQrOpen={() => setQrOpen(true)}
          />
        </aside>

        {/* Mobile sidebar — only mounted when open, fixed, no transform animation */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/70 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-background border-r border-border flex flex-col lg:hidden">
              <SidebarContent
                user={user}
                navigation={navigation}
                isAdmin={isAdmin}
                cafeInfo={cafeInfo}
                dark={dark}
                toggle={toggle}
                onClose={() => setSidebarOpen(false)}
                onQrOpen={() => setQrOpen(true)}
              />
            </aside>
          </>
        )}

        {/* Mobile backdrop (legacy slot kept for spacing) */}
        {false && (
          <div
            className="fixed inset-0 bg-black/70 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-w-0">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>

      {cafeInfo && (
        <CafeQRModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          cafeName={cafeInfo.name}
          cafeSlug={cafeInfo.slug}
        />
      )}
    </div>
  );
}
