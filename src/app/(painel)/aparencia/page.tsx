"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PainelShell } from "@/components/layout/PainelShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CampoImagem } from "@/components/aparencia/CampoImagem";
import { SeletorCor } from "@/components/aparencia/SeletorCor";
import { PreviaCelular } from "@/components/aparencia/PreviaCelular";
import { Banners } from "@/components/aparencia/Banners";
import { api } from "@/lib/api";
import { COR_PADRAO, corValida } from "@/lib/cor";
import { NOME_LOJA } from "@/lib/marca";
import { useMarcaStore } from "@/store/marcaStore";
import { useToastStore } from "@/store/toastStore";
import type { ConfiguracaoLoja, Produto } from "@/types";

function erroApi(err: unknown, padrao: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const msg = (err.response.data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return padrao;
}

interface FormAparencia {
  nomeLoja: string;
  slogan: string;
  enderecoLoja: string;
  instagram: string;
  logoUrl: string | null;
  capaUrl: string | null;
  corPrimaria: string;
}

function paraForm(c: ConfiguracaoLoja): FormAparencia {
  const a = c.aparencia;
  return {
    nomeLoja: a.nomeLoja ?? NOME_LOJA,
    slogan: a.slogan ?? "",
    enderecoLoja: a.enderecoLoja ?? "",
    instagram: a.instagram ? `@${a.instagram}` : "",
    logoUrl: a.logoUrl,
    capaUrl: a.capaUrl,
    corPrimaria: a.corPrimaria ?? COR_PADRAO,
  };
}

type BannerPrevia = { titulo: string; descricao: string | null; imagemUrl: string | null } | null;

function AparenciaContent() {
  const showToast = useToastStore((s) => s.show);
  const aplicarMarca = useMarcaStore((s) => s.aplicar);
  const [config, setConfig] = useState<ConfiguracaoLoja | null>(null);
  const [form, setForm] = useState<FormAparencia | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [bannerPrevia, setBannerPrevia] = useState<BannerPrevia>(null);

  useEffect(() => {
    Promise.all([
      api.get<ConfiguracaoLoja>("/admin/loja/configuracao"),
      api.get<Produto[]>("/admin/cardapio/produtos"),
    ])
      .then(([cfg, prods]) => {
        setConfig(cfg.data);
        setForm(paraForm(cfg.data));
        setProdutos(Array.isArray(prods.data) ? prods.data : []);
      })
      .catch((err) => showToast(erroApi(err, "Não foi possível carregar a aparência."), "error"));
  }, [showToast]);

  const alterar = (parcial: Partial<FormAparencia>) => setForm((f) => (f ? { ...f, ...parcial } : f));
  const onPrevia = useCallback((b: BannerPrevia) => setBannerPrevia(b), []);

  const salvar = async () => {
    if (!form) return;
    if (!form.nomeLoja.trim()) {
      showToast("Informe o nome da loja", "error");
      return;
    }
    if (!corValida(form.corPrimaria)) {
      showToast("Escolha uma cor válida", "error");
      return;
    }
    setSalvando(true);
    try {
      const { data } = await api.put<ConfiguracaoLoja>("/admin/loja/configuracao", {
        nomeLoja: form.nomeLoja.trim(),
        slogan: form.slogan.trim() || null,
        enderecoLoja: form.enderecoLoja.trim() || null,
        instagram: form.instagram.trim() || null,
        logoUrl: form.logoUrl,
        capaUrl: form.capaUrl,
        corPrimaria: form.corPrimaria,
      });
      setConfig(data);
      setForm(paraForm(data));
      aplicarMarca(data.aparencia);
      showToast("Aparência salva. O site atualiza em até 1 minuto.", "success");
    } catch (err) {
      showToast(erroApi(err, "Não foi possível salvar a aparência."), "error");
    } finally {
      setSalvando(false);
    }
  };

  if (!form || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const card = "rounded-lg border border-gray-200 bg-white p-5";
  const previaProdutos = produtos
    .filter((p) => p.disponivel)
    .slice(0, 2)
    .map((p) => ({
      nome: p.nome,
      descricao: p.descricao,
      preco: p.variantes?.length ? Math.min(...p.variantes.map((v) => Number(v.preco))) : Number(p.precoBase),
    }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className={card}>
          <h2 className="text-sm font-semibold text-gray-900">Identidade</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Aparece no topo do site, na aba do navegador e no painel.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Nome da loja"
          name="nomeLoja"
              value={form.nomeLoja}
              maxLength={80}
              onChange={(e) => alterar({ nomeLoja: e.target.value })}
            />
            <Input
              label="Frase curta (opcional)"
          name="slogan"
              value={form.slogan}
              maxLength={80}
              placeholder="Ex.: Smash burger artesanal"
              hint="Aparece embaixo do nome."
              onChange={(e) => alterar({ slogan: e.target.value })}
            />
            <Input
              label="Endereço da loja (opcional)"
          name="enderecoLoja"
              value={form.enderecoLoja}
              maxLength={160}
              placeholder="Rua, número – bairro"
              hint="Mostrado para quem escolhe retirada."
              onChange={(e) => alterar({ enderecoLoja: e.target.value })}
            />
            <Input
              label="Instagram (opcional)"
          name="instagram"
              value={form.instagram}
              maxLength={31}
              placeholder="@sualoja"
              onChange={(e) => alterar({ instagram: e.target.value })}
            />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold text-gray-900">Logo e capa</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            JPG, PNG ou WebP até 8 MB. A imagem é otimizada automaticamente.
          </p>
          <div className="mt-4 space-y-5">
            <CampoImagem
              label="Logo"
              hint="Quadrada, de preferência 400×400 px ou maior. Usada no site, no painel e no ícone da aba."
              valor={form.logoUrl}
              onChange={(url) => alterar({ logoUrl: url })}
              formato="quadrado"
            />
            <CampoImagem
              label="Foto de capa"
              hint="Horizontal, 1600×500 px ou maior: balcão, fachada ou o carro-chefe. Sem capa, o topo mostra só logo e nome."
              valor={form.capaUrl}
              onChange={(url) => alterar({ capaUrl: url })}
              formato="capa"
            />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold text-gray-900">Cor da marca</h2>
          <p className="mb-4 mt-0.5 text-sm text-gray-500">
            Usada em botões, abas e banners sem imagem.
          </p>
          <SeletorCor valor={form.corPrimaria} onChange={(cor) => alterar({ corPrimaria: cor })} />
        </section>

        <div className="flex justify-end">
          <Button onClick={salvar} loading={salvando}>
            Salvar aparência
          </Button>
        </div>

        <Banners produtos={produtos.map((p) => ({ id: p.id, nome: p.nome }))} onPrevia={onPrevia} />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-20">
          <p className="mb-2 text-xs text-gray-500">Prévia no celular (atualiza enquanto você edita)</p>
          <PreviaCelular
            nome={form.nomeLoja}
            slogan={form.slogan}
            logoUrl={form.logoUrl}
            capaUrl={form.capaUrl}
            cor={form.corPrimaria}
            banner={bannerPrevia}
            produtos={previaProdutos}
            cashbackPercentual={config.cashbackPercentual}
          />
        </div>
      </aside>
    </div>
  );
}

export default function AparenciaPage() {
  return (
    <ProtectedRoute allowedProfiles={["ADMIN"]}>
      <PainelShell title="Aparência" subtitle="Como a loja aparece para o cliente">
        <AparenciaContent />
      </PainelShell>
    </ProtectedRoute>
  );
}
