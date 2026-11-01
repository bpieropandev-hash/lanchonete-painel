import type { ReactNode } from "react";
import { Edit, Power, Trash2 } from "lucide-react";

/** Selo de status (Ativo/Inativo, Disponível/Indisponível...). */
export function StatusBadge({
  ativo,
  rotuloAtivo,
  rotuloInativo,
}: {
  ativo: boolean;
  rotuloAtivo: string;
  rotuloInativo: string;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        ativo ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
      }`}
    >
      {ativo ? rotuloAtivo : rotuloInativo}
    </span>
  );
}

type Tom = "neutro" | "ligado" | "desligado" | "perigo";

const TONS: Record<Tom, string> = {
  neutro: "text-gray-700 hover:bg-gray-100",
  ligado: "text-green-600 hover:bg-green-50",
  desligado: "text-gray-500 hover:bg-gray-100",
  perigo: "text-red-600 hover:bg-red-50",
};

/**
 * Botão de ação de uma linha. Por padrão é só o ícone (tabela do desktop);
 * com `rotulo` vira um botão com texto e área de toque maior (cartão no celular).
 */
export function AcaoBotao({
  icone,
  nome,
  onClick,
  tom = "neutro",
  rotulo = false,
}: {
  icone: ReactNode;
  /** Texto do botão; no modo só-ícone vira aria-label e dica. */
  nome: string;
  onClick: () => void;
  tom?: Tom;
  rotulo?: boolean;
}) {
  const base = rotulo
    ? "inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium"
    : "rounded p-1";
  return (
    <button
      onClick={onClick}
      className={`${base} ${TONS[tom]}`}
      aria-label={nome}
      title={rotulo ? undefined : nome}
    >
      {icone}
      {rotulo && nome}
    </button>
  );
}

/**
 * Editar / ativar-desativar / excluir. Cada botão só aparece se o handler for
 * passado, assim a página decide o que cada perfil pode fazer.
 */
export function AcoesLinha({
  ativo,
  rotulos = false,
  onEditar,
  onToggle,
  onExcluir,
}: {
  ativo: boolean;
  rotulos?: boolean;
  onEditar?: () => void;
  onToggle?: () => void;
  onExcluir?: () => void;
}) {
  return (
    <>
      {onEditar && (
        <AcaoBotao icone={<Edit size={16} />} nome="Editar" onClick={onEditar} rotulo={rotulos} />
      )}
      {onToggle && (
        <AcaoBotao
          icone={<Power size={16} />}
          nome={ativo ? "Desativar" : "Ativar"}
          onClick={onToggle}
          tom={ativo ? "ligado" : "desligado"}
          rotulo={rotulos}
        />
      )}
      {onExcluir && (
        <AcaoBotao
          icone={<Trash2 size={16} />}
          nome="Excluir"
          onClick={onExcluir}
          tom="perigo"
          rotulo={rotulos}
        />
      )}
    </>
  );
}
