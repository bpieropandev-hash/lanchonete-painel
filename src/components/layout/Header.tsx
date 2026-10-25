"use client";

import { ReactNode } from "react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onOpenSidebar: () => void;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function Header({ onOpenSidebar, title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-4 py-2 lg:px-6">
      <button
        onClick={onOpenSidebar}
        className="-ml-1 rounded-md p-1.5 text-gray-700 hover:bg-gray-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      {title && <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>}
      {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
