"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ChefHat,
  Menu as MenuIcon,
  Bike,
  DollarSign,
  Users,
  X,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNotificacaoStore } from "@/store/notificacaoStore";
import type { PerfilUsuario } from "@/types";
import { perfilLabel } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  profiles: PerfilUsuario[];
  badge?: boolean;
}

const items: NavItem[] = [
  {
    href: "/pedidos",
    label: "Pedidos",
    icon: ClipboardList,
    profiles: ["ADMIN", "ATENDENTE"],
    badge: true,
  },
  {
    href: "/chapeiro",
    label: "Chapeiro",
    icon: ChefHat,
    profiles: ["ADMIN", "CHAPEIRO"],
  },
  {
    href: "/cardapio",
    label: "Cardápio",
    icon: MenuIcon,
    profiles: ["ADMIN", "ATENDENTE"],
  },
  {
    href: "/entregadores",
    label: "Entregadores",
    icon: Bike,
    profiles: ["ADMIN", "ATENDENTE"],
  },
  {
    href: "/caixa",
    label: "Caixa",
    icon: DollarSign,
    profiles: ["ADMIN", "ATENDENTE"],
  },
  {
    href: "/usuarios",
    label: "Usuários",
    icon: Users,
    profiles: ["ADMIN"],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { funcionario, logout } = useAuthStore();
  const novosCount = useNotificacaoStore((s) => s.novosCount);

  if (!funcionario) return null;

  const visibleItems = items.filter((it) =>
    it.profiles.includes(funcionario.perfil)
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <Link href="/pedidos" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <ChefHat size={20} />
            </div>
            <span className="text-base font-bold text-gray-900">
              Painel
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {item.label}
                </span>
                {item.badge && novosCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {novosCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 rounded-lg bg-gray-50 px-3 py-2">
            <p className="truncate text-sm font-semibold text-gray-900">
              {funcionario.nome}
            </p>
            <p className="text-xs text-gray-500">
              {perfilLabel(funcionario.perfil)}
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
