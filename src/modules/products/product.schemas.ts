import { z } from "zod";

/**
 * 🔹 Item de estoque por centro de distribuição
 */
export const estoqueItemSchema = z.object({
  centroDistribuicaoId: z.number(),
  estoqueFisico: z.number(),
  estoqueReservado: z.number(),
  alertaEstoque: z.number()
});

export type EstoqueItem = z.infer<typeof estoqueItemSchema>;

/**
 * 🔹 Produto vindo da Tray (AJUSTE AQUI 👇)
 */
export const trayProductSchema = z.object({
  produtoVarianteId: z.number(),
  produtoId: z.number(),

  idPaiExterno: z
    .union([z.string(), z.number(), z.null()])
    .transform(v => (v === null || v === "" ? null : Number(v))),

  sku: z.string(),
  nome: z.string(),
  nomeProdutoPai: z.string().nullable(),

  precoCusto: z.number().nullable(),
  precoDe: z.number().nullable(),
  precoPor: z.number().nullable(),

  ean: z.string().nullable(),

  // 🔥 agora tipado corretamente
  estoque: z.array(estoqueItemSchema),

  dataCriacao: z.string(),
  dataAtualizacao: z.string(),

  parentId: z.union([z.number(), z.string(), z.null()])
    .transform(v => (v ? Number(v) : null)),
});

/**
 * 🔹 Mantido como está (SEM ALTERAÇÃO)
 */
export const tempProductSchema = z.object({
  produtoVarianteId: z.number(),
  produtoId: z.number(),
  idPaiExterno: z.number().nullable(),

  sku: z.string(),
  nome: z.string(),
  nomeProdutoPai: z.string().nullable(),

  precoCusto: z.number().nullable(),
  precoDe: z.number().nullable(),
  precoPor: z.number().nullable(),

  ean: z.string().nullable(),

  centroDistribuicaoId: z.number(),
  estoqueFisico: z.number(),
  estoqueReservado: z.number(),
  alertaEstoque: z.number(),

  dataCriacao: z.string(),
  dataAtualizacao: z.string(),

  parentId: z.number().nullable(),

  raw_payload: z.unknown()
});


export type TempProduct = z.infer<typeof tempProductSchema>;
