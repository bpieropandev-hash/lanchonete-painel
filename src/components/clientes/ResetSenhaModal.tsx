"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { linkWhatsApp, formatTelefone } from "@/lib/format";
import {
  linkRedefinirSenha,
  mensagemRedefinirSenha,
  siteUrlConfigurada,
} from "@/lib/resetSenha";
import { useToastStore } from "@/store/toastStore";
import type { ClienteAdmin, ResetSenhaGerado } from "@/types";

interface Props {
  cliente: ClienteAdmin | null;
  onClose: () => void;
}

function horaCurtaDe(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ResetSenhaModal({ cliente, onClose }: Props) {
  const [gerado, setGerado] = useState<ResetSenhaGerado | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    setGerado(null);
    setErro(null);
    setLoading(false);
  }, [cliente?.id]);

  if (!cliente) return null;

  const gerar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.post<ResetSenhaGerado>(
        `/admin/clientes/${cliente.id}/reset-senha`
      );
      setGerado(data);
    } catch {
      setErro("Não foi possível gerar o link. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  const link = gerado ? linkRedefinirSenha(gerado.token) : "";
  const mensagem = gerado
    ? mensagemRedefinirSenha(cliente.nome, link, gerado.expiraEm)
    : "";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copiado.", "success");
    } catch {
      showToast("Não foi possível copiar. Selecione o link e copie.", "error");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Redefinir senha"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {!gerado && (
            <Button leftIcon={<KeyRound size={16} />} loading={loading} onClick={gerar}>
              Gerar link
            </Button>
          )}
        </div>
      }
    >
      <p className="text-sm text-gray-700">
        <span className="font-medium">{cliente.nome}</span> · {formatTelefone(cliente.telefone)}
      </p>

      {!gerado && (
        <p className="mt-3 text-sm text-gray-600">
          Confira que o pedido de ajuda veio do WhatsApp deste telefone. O link vale por 1 hora,
          só funciona uma vez e substitui qualquer link anterior.
        </p>
      )}

      {erro && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {gerado && (
        <div className="mt-3 space-y-3">
          {!siteUrlConfigurada && (
            <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              NEXT_PUBLIC_SITE_URL não está configurada: o link abaixo não tem o endereço do site.
            </p>
          )}
          <label className="block text-sm font-medium text-gray-700" htmlFor="link-reset">
            Link (aparece só agora)
          </label>
          <textarea
            id="link-reset"
            readOnly
            rows={3}
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none break-all rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Copy size={16} />} onClick={copiar}>
              Copiar link
            </Button>
            <a
              href={linkWhatsApp(cliente.telefone, mensagem)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <MessageCircle size={16} /> Enviar pelo WhatsApp
            </a>
          </div>
          <p className="text-xs text-gray-500">Válido até {horaCurtaDe(gerado.expiraEm)}.</p>
        </div>
      )}
    </Modal>
  );
}
