import { STATUS_CLASSE, STATUS_ROTULO } from "@/lib/estoque";
import type { StatusInsumo as Status } from "@/types/estoque";

/** Selo de status do insumo: OK, Baixo, Zerado, Negativo (ou Inativo). */
export function StatusInsumo({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[status]}`}
    >
      {STATUS_ROTULO[status]}
    </span>
  );
}
