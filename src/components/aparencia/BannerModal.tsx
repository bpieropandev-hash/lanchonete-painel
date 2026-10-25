"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { CampoImagem } from "./CampoImagem";
import type { Banner } from "@/types";

export interface BannerForm {
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  produtoId: string;
  inicio: string;
  fim: string;
  ativo: boolean;
}

const VAZIO: BannerForm = {
  titulo: "",
  descricao: "",
  imagemUrl: null,
  produtoId: "",
  inicio: "",
  fim: "",
  ativo: true,
};

interface BannerModalProps {
  open: boolean;
  banner: Banner | null;
  produtos: { id: string; nome: string }[];
  salvando: boolean;
  onClose: () => void;
  onSalvar: (form: BannerForm) => void;
  /** Avisa a prévia enquanto o admin digita. */
  onAlterar: (form: BannerForm) => void;
}

export function BannerModal({ open, banner, produtos, salvando, onClose, onSalvar, onAlterar }: BannerModalProps) {
  const [form, setForm] = useState<BannerForm>(VAZIO);

  useEffect(() => {
    if (!open) return;
    setForm(
      banner
        ? {
            titulo: banner.titulo,
            descricao: banner.descricao ?? "",
            imagemUrl: banner.imagemUrl,
            produtoId: banner.produtoId ?? "",
            inicio: banner.inicio ?? "",
            fim: banner.fim ?? "",
            ativo: banner.ativo,
          }
        : VAZIO
    );
  }, [open, banner]);

  const alterar = (parcial: Partial<BannerForm>) => {
    const novo = { ...form, ...parcial };
    setForm(novo);
    onAlterar(novo);
  };

  const periodoInvertido = !!form.inicio && !!form.fim && form.fim < form.inicio;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={banner ? "Editar banner" : "Novo banner"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSalvar(form)}
            loading={salvando}
            disabled={form.titulo.trim().length < 2 || periodoInvertido}
          >
            Salvar banner
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Título"
          name="bannerTitulo"
          value={form.titulo}
          maxLength={60}
          placeholder="Ex.: Terça do smash"
          onChange={(e) => alterar({ titulo: e.target.value })}
        />
        <Input
          label="Texto (opcional)"
          name="bannerDescricao"
          value={form.descricao}
          maxLength={120}
          placeholder="Ex.: 2 smash + batata por R$ 39,90"
          onChange={(e) => alterar({ descricao: e.target.value })}
        />
        <CampoImagem
          label="Imagem (opcional)"
          hint="Horizontal, 1200×400 px ou maior. Sem imagem, o banner usa a cor da marca."
          valor={form.imagemUrl}
          onChange={(url) => alterar({ imagemUrl: url })}
          formato="capa"
        />
        <Select
          label="Ao tocar, abrir o produto (opcional)"
          name="bannerProduto"
          value={form.produtoId}
          onChange={(e) => alterar({ produtoId: e.target.value })}
        >
          <option value="">Nenhum</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Começa em (opcional)"
          name="bannerInicio"
            type="date"
            value={form.inicio}
            onChange={(e) => alterar({ inicio: e.target.value })}
          />
          <Input
            label="Termina em (opcional)"
          name="bannerFim"
            type="date"
            value={form.fim}
            onChange={(e) => alterar({ fim: e.target.value })}
            error={periodoInvertido ? "Termina antes de começar" : undefined}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => alterar({ ativo: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          Banner ativo
        </label>
      </div>
    </Modal>
  );
}
