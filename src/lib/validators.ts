import { z } from "zod";
import { lerValorCaixa, periodoValido } from "./caixa";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const esqueciSenhaSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail").email("E-mail inválido"),
});
export type EsqueciSenhaInput = z.infer<typeof esqueciSenhaSchema>;

// 10 caracteres e no máximo 72 bytes: mesma regra da API para funcionários.
export const novaSenhaPorEmailSchema = z
  .object({
    novaSenha: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .refine((v) => new TextEncoder().encode(v).length <= 72, "Senha muito longa"),
    confirmar: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "As senhas não conferem",
    path: ["confirmar"],
  });
export type NovaSenhaPorEmailInput = z.infer<typeof novaSenhaPorEmailSchema>;

export const produtoSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  descricao: z.string().min(5, "Mínimo 5 caracteres"),
  precoBase: z.number().positive("Preço deve ser positivo"),
  fotoUrl: z
    .string()
    .refine(
      (v) => !v || v.startsWith("/") || /^https?:\/\//.test(v),
      "Informe uma URL válida ou faça upload de uma imagem",
    )
    .optional(),
  categoriaId: z.string().min(1, "Selecione uma categoria"),
  ordem: z.number().int().nonnegative(),
});
export type ProdutoInput = z.infer<typeof produtoSchema>;

export const categoriaSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  ordem: z.number().int().nonnegative(),
  tipo: z.enum(["LANCHE", "BEBIDA", "OUTRO"]),
});
export type CategoriaInput = z.infer<typeof categoriaSchema>;

export const ingredienteSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  precoAdicional: z.number().nonnegative("Preço inválido"),
  removivel: z.boolean(),
});
export type IngredienteInput = z.infer<typeof ingredienteSchema>;

export const entregadorSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos"),
  /** "" = sem acesso à tela de entregas */
  usuarioId: z.string(),
});
export type EntregadorInput = z.infer<typeof entregadorSchema>;

export const usuarioSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(10, "Senha deve ter no mínimo 10 caracteres"),
  perfil: z.enum(["ADMIN", "ATENDENTE", "CHAPEIRO", "ENTREGADOR"]),
});
export type UsuarioInput = z.infer<typeof usuarioSchema>;

export const usuarioEditSchema = z.object({
  nome: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  perfil: z.enum(["ADMIN", "ATENDENTE", "CHAPEIRO", "ENTREGADOR"]),
});
export type UsuarioEditInput = z.infer<typeof usuarioEditSchema>;

export const senhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Senha atual obrigatória"),
    novaSenha: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmar: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "As senhas não conferem",
    path: ["confirmar"],
  });
export type SenhaInput = z.infer<typeof senhaSchema>;

/** Redefinição pelo administrador: sem a senha atual do funcionário. */
export const redefinirSenhaSchema = z
  .object({
    novaSenha: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmar: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "As senhas não conferem",
    path: ["confirmar"],
  });
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;

export const fecharCaixaSchema = z.object({
  obs: z.string().max(500, "Máximo 500 caracteres").optional(),
  fundoTroco: z
    .string()
    .refine(
      (v) => lerValorCaixa(v, 100_000) !== null,
      "Informe um valor válido de 0 a R$ 100.000,00",
    ),
  dinheiroConferido: z
    .string()
    .refine(
      (v) => lerValorCaixa(v, 1_000_000) !== null,
      "Informe o valor contado, de 0 a R$ 1.000.000,00",
    ),
});
export type FecharCaixaInput = z.infer<typeof fecharCaixaSchema>;

export const reabrirCaixaSchema = z.object({
  motivo: z
    .string()
    .min(3, "Informe ao menos 3 caracteres")
    .max(500, "Máximo 500 caracteres"),
});
export type ReabrirCaixaInput = z.infer<typeof reabrirCaixaSchema>;

export const periodoSchema = z
  .object({
    dataInicio: z.string().min(1, "Data inicial obrigatória"),
    dataFim: z.string().min(1, "Data final obrigatória"),
  })
  .refine((v) => periodoValido(v.dataInicio, v.dataFim), {
    path: ["dataFim"],
    message: "Escolha datas válidas em ordem, com até 366 dias",
  });
export type PeriodoInput = z.infer<typeof periodoSchema>;
