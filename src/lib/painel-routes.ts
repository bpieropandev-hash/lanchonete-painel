import type { PerfilUsuario } from "@/types";

/** Rota inicial após login, por perfil. */
export function getDefaultRoute(perfil: PerfilUsuario): string {
  switch (perfil) {
    case "CHAPEIRO":
      return "/chapeiro";
    case "ENTREGADOR":
      return "/entrega";
    default:
      return "/pedidos";
  }
}

/**
 * Prefixos de rota permitidos no app (painel). A home "/" redireciona sozinha.
 */
const PREFIXOS_POR_PERFIL: Record<PerfilUsuario, string[]> = {
  ADMIN: [
    "/pedidos",
    "/chapeiro",
    "/cardapio",
    "/entregadores",
    "/caixa",
    "/usuarios",
    "/entrega",
  ],
  ATENDENTE: ["/pedidos", "/cardapio", "/entregadores", "/caixa"],
  CHAPEIRO: ["/chapeiro"],
  ENTREGADOR: ["/entrega"],
};

export function isPainelRouteAllowed(
  perfil: PerfilUsuario,
  pathname: string
): boolean {
  if (pathname === "/") return true;
  return PREFIXOS_POR_PERFIL[perfil].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
