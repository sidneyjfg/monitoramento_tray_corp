// src/modules/products/product.service.ts
import { fetchTrayProducts } from "../../clients/trayClient";
import { getMonitoramentoConnection } from "../../config/dbConfig";
import { notificationService } from "../notification/notification.service";
import { ProductRepository } from "./product.repository";
import { trayProductSchema, tempProductSchema, TempProduct } from "./product.schemas";

export class ProductService {
  private repository = new ProductRepository();

  async syncTrayProductsToTemp() {
    const start = Date.now();
    let invalid = 0;
    let inserted = 0;

    const BATCH_SIZE = 1000;

    await this.repository.clearTempTable();

    const pages = await fetchTrayProducts(async (rawProducts, page) => {
      const batch: TempProduct[] = [];

      for (const raw of rawProducts) {
        const parsed = trayProductSchema.safeParse(raw);

        if (!parsed.success) {
          invalid++;
          continue;
        }

        const prd = parsed.data;

        for (const stock of prd.estoque) {
          batch.push(
            tempProductSchema.parse({
              produtoVarianteId: prd.produtoVarianteId,
              produtoId: prd.produtoId,
              idPaiExterno: prd.idPaiExterno,

              sku: prd.sku,
              nome: prd.nome,
              nomeProdutoPai: prd.nomeProdutoPai,

              precoCusto: prd.precoCusto,
              precoDe: prd.precoDe,
              precoPor: prd.precoPor,

              ean: prd.ean,

              centroDistribuicaoId: stock.centroDistribuicaoId,
              estoqueFisico: stock.estoqueFisico,
              estoqueReservado: stock.estoqueReservado,
              alertaEstoque: stock.alertaEstoque,

              dataCriacao: prd.dataCriacao,
              dataAtualizacao: prd.dataAtualizacao,

              parentId: prd.parentId,

              // ⚠️ payload reduzido (evita explodir memória)
              raw_payload: {
                produtoVarianteId: prd.produtoVarianteId,
                produtoId: prd.produtoId,
                sku: prd.sku
              }
            })
          );
        }
      }

      // 🔥 INSERT EM SUB-BATCH
      for (let i = 0; i < batch.length; i += BATCH_SIZE) {
        const slice = batch.slice(i, i + BATCH_SIZE);
        await this.repository.insertManyTemp(slice);
        inserted += slice.length;
      }

      console.log(`✅ Página ${page} inserida (${batch.length} linhas)`);
    });

    const duration = Math.round((Date.now() - start) / 1000);

    await notificationService.notifySyncResult({
      totalProducts: inserted,
      totalPages: pages,
      durationSeconds: duration
    });

    return {
      inserted,
      invalid
    };
  }

}

export const clearTempOrders = async () => {
  const connection = await getMonitoramentoConnection();

  try {
    await connection.query('TRUNCATE TABLE temp_products');
    console.log('Tabela temp_products limpa com sucesso.');
  } catch (error: unknown) {
    console.error('Erro ao limpar a tabela temp_orders:', error);
    throw error;
  } finally {
    connection.release();
  }
};