"use client";

import { useState } from "react";
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
  Store,
  KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNotificacaoStore } from "@/store/notificacaoStore";
import type { PerfilUsuario } from "@/types";
import { perfilLabel } from "@/lib/format";
import { getDefaultRoute } from "@/lib/painel-routes";
import { SenhaModal } from "@/components/usuarios/SenhaModal";
import { iniciaisLoja, nomeCurtoLoja } from "@/lib/marca";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number }>;
  profiles: PerfilUsuario[];
  grupo: "operacao" | "gestao";
  badge?: boolean;
}

const items: NavItem[] = [
  {
    href: "/pedidos",
    label: "Pedidos",
    icon: ClipboardList,
    profiles: ["ADMIN", "ATENDENTE"],
    grupo: "operacao",
    badge: true,
  },
  {
    href: "/chapeiro",
    label: "Cozinha",
    icon: ChefHat,
    profiles: ["ADMIN", "CHAPEIRO"],
    grupo: "operacao",
  },
  {
    href: "/loja",
    label: "Loja e horários",
    icon: Store,
    profiles: ["ADMIN", "ATENDENTE"],
    grupo: "gestao",
  },
  {
    href: "/cardapio",
    label: "Cardápio",
    icon: MenuIcon,
    profiles: ["ADMIN", "ATENDENTE"],
    grupo: "gestao",
  },
  {
    href: "/entregadores",
    label: "Entregadores",
    icon: Bike,
    profiles: ["ADMIN", "ATENDENTE"],
    grupo: "gestao",
  },
  {
    href: "/caixa",
    label: "Caixa",
    icon: DollarSign,
    profiles: ["ADMIN", "ATENDENTE"],
    grupo: "operacao",
  },
  {
    href: "/usuarios",
    label: "Usuários",
    icon: Users,
    profiles: ["ADMIN"],
    grupo: "gestao",
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
  const [senhaAberta, setSenhaAberta] = useState(false);

  if (!funcionario) return null;

  const visibleItems = items.filter((it) =>
    it.profiles.includes(funcionario.perfil)
  );

  const grupos: { id: NavItem["grupo"]; titulo: string }[] = [
    { id: "operacao", titulo: "Operação" },
    { id: "gestao", titulo: "Gestão" },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-gray-200 bg-gray-50 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <Link
            href={getDefaultRoute(funcionario.perfil)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-500 text-xs font-bold text-white">
              {iniciaisLoja()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900">{nomeCurtoLoja()}</span>
              <span className="block text-xs text-gray-500">Painel da loja</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {grupos.map((g) => {
            const doGrupo = visibleItems.filter((it) => it.grupo === g.id);
            if (doGrupo.length === 0) return null;
            return (
              <div key={g.id} className="mt-3">
                <p className="px-2 pb-1 text-xs font-medium text-gray-500">{g.titulo}</p>
                <div className="space-y-0.5">
                  {doGrupo.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-white font-medium text-gray-900 shadow-sm ring-1 ring-gray-200"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon size={16} strokeWidth={1.8} />
                          {item.label}
                        </span>
                        {item.badge && novosCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded bg-primary-500 px-1.5 text-xs font-semibold text-white">
                            {novosCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
              {funcionario.nome
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{funcionario.nome}</p>
              <p className="text-xs text-gray-500">{perfilLabel(funcionario.perfil)}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <button
              onClick={() => setSenhaAberta(true)}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <KeyRound size={14} />
              Alterar senha
            </button>
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </aside>
      <SenhaModal
        modo="propria"
        open={senhaAberta}
        onClose={() => setSenhaAberta(false)}
      />
    </>
  );
}
