"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface PainelShellProps {
  children: ReactNode;
  title?: string;
}

export function PainelShell({ children, title }: PainelShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onOpenSidebar={() => setSidebarOpen(true)} title={title} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
