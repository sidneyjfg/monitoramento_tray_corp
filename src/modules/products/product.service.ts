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

    const { products: rawProducts, pages } = await fetchTrayProducts();

    const valid: TempProduct[] = [];
    let invalid = 0;

    for (const raw of rawProducts) {
      const parsed = trayProductSchema.safeParse(raw);

      if (!parsed.success) {
        invalid++;
        continue;
      }

      const prd = parsed.data;

      // 🔥 explode o array de estoque
      for (const stock of prd.estoque) {
        const temp = tempProductSchema.parse({
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

          raw_payload: raw
        });

        valid.push(temp);
      }
    }

    await this.repository.clearTempTable();
    await this.repository.insertManyTemp(valid);

    const duration = Math.round((Date.now() - start) / 1000);

    // 🔥🔥🔥 ENVIO DA NOTIFICAÇÃO AQUI 🔥🔥🔥
    await notificationService.notifySyncResult({
      totalProducts: valid.length,
      totalPages: pages,
      durationSeconds: duration
    });

    return {
      inserted: valid.length,
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