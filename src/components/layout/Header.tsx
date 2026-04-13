"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  onOpenSidebar: () => void;
  title?: string;
}

export function Header({ onOpenSidebar, title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        {title && (
          <h1 className="text-base font-semibold text-gray-900 lg:text-lg">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}
