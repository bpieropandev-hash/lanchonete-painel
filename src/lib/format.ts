export function formatBRL(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatTelefone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return telefone;
}

export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
}

export function formatHora(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatData(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDataHora(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${formatData(d)} ${formatHora(d)}`;
}

export function tempoDesde(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOVO: "Novo",
    PREPARANDO: "Preparando",
    SAIU_ENTREGA: "Saiu para entrega",
    ENTREGUE: "Entregue",
    CANCELADO: "Cancelado",
  };
  return labels[status] || status;
}

export function tipoPagamentoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    PIX: "PIX",
    DINHEIRO: "Dinheiro",
    CARTAO: "Cartão",
  };
  return labels[tipo] || tipo;
}

export function perfilLabel(perfil: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    ATENDENTE: "Atendente",
    CHAPEIRO: "Chapeiro",
    ENTREGADOR: "Entregador",
  };
  return labels[perfil] || perfil;
}
