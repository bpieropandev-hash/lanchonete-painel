import { api } from "@/lib/api";

/**
 * Envia uma imagem para a API, que valida, corrige a rotação e converte para
 * WebP. "capa" guarda em largura maior (capa da loja e banners).
 */
export async function enviarImagem(file: File, tipo?: "capa"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ url: string }>("/admin/uploads/foto", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: tipo ? { tipo } : undefined,
  });
  return data.url;
}
