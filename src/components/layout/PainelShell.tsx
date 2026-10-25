"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface PainelShellProps {
  children: ReactNode;
  title?: string;
  /** Texto curto ao lado do título (ex.: data do expediente). */
  subtitle?: ReactNode;
  /** Ações à direita do cabeçalho. */
  actions?: ReactNode;
}

export function PainelShell({ children, title, subtitle, actions }: PainelShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-60">
        <Header onOpenSidebar={() => setSidebarOpen(true)} title={title} subtitle={subtitle} actions={actions} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
