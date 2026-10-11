/**
 * Resolve a foto URL: se for relativa (começa com '/') prefixa com a
 * base da API sem o sufixo /api/v1, senão devolve como está.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const apiBase =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_API_URL) ||
    "http://localhost:3000/api/v1";
  const origin = apiBase.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  return `${origin}${url}`;
}

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
  // "YYYY-MM-DD" puro (datas do caixa): new Date() interpretaria como meia-noite
  // UTC e, no Brasil, mostraria o dia anterior.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [ano, mes, dia] = date.split("-");
    return `${dia}/${mes}/${ano}`;
  }
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
    AGUARDANDO_CONFIRMACAO: "Aguardando WhatsApp",
    NOVO: "Novo",
    PREPARANDO: "Preparando",
    PRONTO: "Pronto p/ retirada",
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

/** Nome e telefone do pedido: contato do convidado ou do cliente com conta. */
export function contatoDoPedido(pedido: {
  nomeContato?: string | null;
  telefoneContato?: string | null;
  cliente?: { nome: string; telefone: string } | null;
}): { nome: string; telefone: string } {
  return {
    nome: pedido.nomeContato || pedido.cliente?.nome || "Cliente",
    telefone: pedido.telefoneContato || pedido.cliente?.telefone || "",
  };
}

/** Link para abrir conversa no WhatsApp com um telefone brasileiro. */
export function linkWhatsApp(telefone: string, texto?: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
