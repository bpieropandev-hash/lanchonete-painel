"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { BannerModal, type BannerForm } from "./BannerModal";
import type { Banner } from "@/types";

function erroApi(err: unknown, padrao: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const msg = (err.response.data as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg[0];
    if (msg) return msg;
  }
  return padrao;
}

function periodo(b: Banner): string {
  const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
  if (b.inicio && b.fim) return `${fmt(b.inicio)} a ${fmt(b.fim)}`;
  if (b.inicio) return `a partir de ${fmt(b.inicio)}`;
  if (b.fim) return `até ${fmt(b.fim)}`;
  return "Sem data para acabar";
}

interface BannersProps {
  produtos: { id: string; nome: string }[];
  /** Banner mostrado na prévia: o que está sendo editado ou o primeiro ativo. */
  onPrevia: (banner: { titulo: string; descricao: string | null; imagemUrl: string | null } | null) => void;
}

export function Banners({ produtos, onPrevia }: BannersProps) {
  const showToast = useToastStore((s) => s.show);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<Banner[]>("/admin/loja/banners");
      setBanners(data);
    } catch (err) {
      showToast(erroApi(err, "Não foi possível carregar os banners."), "error");
    }
  }, [showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (aberto) return;
    const primeiro = banners.find((b) => b.ativo);
    onPrevia(primeiro ?? null);
  }, [banners, aberto, onPrevia]);

  const salvar = async (form: BannerForm) => {
    setSalvando(true);
    const body = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      imagemUrl: form.imagemUrl,
      produtoId: form.produtoId || null,
      inicio: form.inicio || null,
      fim: form.fim || null,
      ativo: form.ativo,
    };
    try {
      if (editando) await api.patch(`/admin/loja/banners/${editando.id}`, body);
      else await api.post("/admin/loja/banners", { ...body, ordem: banners.length });
      showToast("Banner salvo", "success");
      setAberto(false);
      await carregar();
    } catch (err) {
      showToast(erroApi(err, "Não foi possível salvar o banner."), "error");
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (b: Banner) => {
    try {
      await api.patch(`/admin/loja/banners/${b.id}`, { ativo: !b.ativo });
      await carregar();
    } catch (err) {
      showToast(erroApi(err, "Não foi possível alterar o banner."), "error");
    }
  };

  const excluir = async (b: Banner) => {
    if (!window.confirm(`Excluir o banner "${b.titulo}"?`)) return;
    try {
      await api.delete(`/admin/loja/banners/${b.id}`);
      await carregar();
    } catch (err) {
      showToast(erroApi(err, "Não foi possível excluir o banner."), "error");
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Banners de promoção</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Aparecem no topo do cardápio. No máximo 5 ao mesmo tempo, na ordem da lista.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus size={16} />}
          onClick={() => {
            setEditando(null);
            setAberto(true);
          }}
        >
          Novo banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
          Nenhum banner. Use para combos, promoção do dia ou novidades.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {banners.map((b) => {
            const imagem = resolveImageUrl(b.imagemUrl);
            return (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <div className="h-10 w-20 shrink-0 overflow-hidden rounded bg-gray-100">
                  {imagem && <img src={imagem} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{b.titulo}</p>
                  <p className="text-xs text-gray-500">{periodo(b)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => alternar(b)}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    b.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {b.ativo ? "Ativo" : "Desligado"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditando(b);
                    setAberto(true);
                  }}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label={`Editar ${b.titulo}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => excluir(b)}
                  className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Excluir ${b.titulo}`}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <BannerModal
        open={aberto}
        banner={editando}
        produtos={produtos}
        salvando={salvando}
        onClose={() => setAberto(false)}
        onSalvar={salvar}
        onAlterar={(f) => onPrevia({ titulo: f.titulo, descricao: f.descricao || null, imagemUrl: f.imagemUrl })}
      />
    </section>
  );
}
