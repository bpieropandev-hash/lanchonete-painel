/* eslint-disable @next/next/no-img-element */
import { contraste, corValida, COR_PADRAO } from "@/lib/cor";
import { formatBRL, resolveImageUrl } from "@/lib/format";
import { iniciaisLoja } from "@/lib/marca";

interface PreviaCelularProps {
  nome: string;
  slogan: string;
  logoUrl: string | null;
  capaUrl: string | null;
  cor: string;
  banner: { titulo: string; descricao: string | null; imagemUrl: string | null } | null;
  produtos: { nome: string; descricao: string | null; preco: number }[];
  cashbackPercentual: number;
}

/** Como o topo do site fica no celular, com os dados ainda não salvos. */
export function PreviaCelular({
  nome,
  slogan,
  logoUrl,
  capaUrl,
  cor,
  banner,
  produtos,
  cashbackPercentual,
}: PreviaCelularProps) {
  const corFinal = corValida(cor) ? cor : COR_PADRAO;
  const textoBotao = contraste(corFinal).texto === "branco" ? "#fff" : "#111";
  const logo = resolveImageUrl(logoUrl);
  const capa = resolveImageUrl(capaUrl);
  const imagemBanner = resolveImageUrl(banner?.imagemUrl);

  return (
    <div className="mx-auto w-[340px] overflow-hidden rounded-[2rem] border-[7px] border-gray-900 bg-white shadow-sm">
      <div className="relative h-[620px] overflow-hidden font-sans">
        {capa ? (
          <img src={capa} alt="" className="h-28 w-full object-cover" />
        ) : (
          <div className="h-6" />
        )}
        <div className="px-4">
          <div className={`flex items-end gap-3 ${capa ? "-mt-8" : ""}`}>
            {logo ? (
              <img src={logo} alt="" className="h-16 w-16 rounded-2xl border-[3px] border-white object-cover" />
            ) : (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-white text-lg font-bold"
                style={{ backgroundColor: corFinal, color: textoBotao }}
              >
                {iniciaisLoja(nome || "Loja")}
              </span>
            )}
          </div>
          <p className="mt-2 text-lg font-bold leading-tight">{nome || "Nome da loja"}</p>
          {slogan && <p className="text-xs text-gray-500">{slogan}</p>}
          <p className="mt-1 text-xs text-gray-600">
            <span className="font-semibold text-green-700">Aberto</span> · entrega 40 min
          </p>
          {cashbackPercentual > 0 && (
            <p className="mt-2 inline-flex rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
              {cashbackPercentual}% de cashback em todo pedido
            </p>
          )}
        </div>

        {banner && (
          <div
            className="relative mx-4 mt-3 h-20 overflow-hidden rounded-xl p-3"
            style={{ backgroundColor: corFinal, color: textoBotao }}
          >
            {imagemBanner && <img src={imagemBanner} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            {imagemBanner && <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />}
            <div className={`relative ${imagemBanner ? "text-white" : ""}`}>
              <p className="text-sm font-bold">{banner.titulo || "Título do banner"}</p>
              {banner.descricao && <p className="text-[11px] opacity-90">{banner.descricao}</p>}
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-4 border-b px-4 text-xs font-semibold text-gray-500">
          <span className="py-2 text-gray-900" style={{ boxShadow: `inset 0 -2px 0 ${corFinal}` }}>
            Lanches
          </span>
          <span className="py-2">Porções</span>
          <span className="py-2">Bebidas</span>
        </div>
        {produtos.map((p) => (
          <div key={p.nome} className="border-b px-4 py-3">
            <p className="text-sm font-semibold">{p.nome}</p>
            {p.descricao && <p className="line-clamp-2 text-[11px] text-gray-500">{p.descricao}</p>}
            <p className="mt-1 text-xs font-semibold">{formatBRL(p.preco)}</p>
          </div>
        ))}

        <div
          className="absolute inset-x-3 bottom-3 flex h-11 items-center justify-between rounded-lg px-4 text-sm font-semibold"
          style={{ backgroundColor: corFinal, color: textoBotao }}
        >
          <span>Ver sacola</span>
          <span>{formatBRL(produtos[0]?.preco ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}
