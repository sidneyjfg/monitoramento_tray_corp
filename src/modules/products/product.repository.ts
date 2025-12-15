// src/modules/products/product.repository.ts
import { sqlMonitoramentoPool } from "../../config/dbConfig";
import { TempProduct } from "./product.schemas";

export class ProductRepository {
  async clearTempTable(): Promise<void> {
    await sqlMonitoramentoPool.query("TRUNCATE TABLE temp_products");
  }

  async insertManyTemp(products: TempProduct[]): Promise<void> {
    if (products.length === 0) return;

    const values = products.map((p) => [
      p.produtoVarianteId,
      p.produtoId,
      p.idPaiExterno,
      p.sku,
      p.nome,
      p.nomeProdutoPai,

      p.precoCusto,
      p.precoDe,
      p.precoPor,

      p.ean,

      p.centroDistribuicaoId,
      p.estoqueFisico,
      p.estoqueReservado,
      p.alertaEstoque,

      p.dataCriacao,
      p.dataAtualizacao,

      p.parentId,

      JSON.stringify(p.raw_payload)
    ]);

    const sql = `
      INSERT INTO temp_products (
        produtoVarianteId,
        produtoId,
        idPaiExterno,
        sku,
        nome,
        nomeProdutoPai,
        precoCusto,
        precoDe,
        precoPor,
        ean,
        estoque,
        dataCriacao,
        dataAtualizacao,
        parentId,
        raw_payload
      ) VALUES ?
    `;

    await sqlMonitoramentoPool.query(sql, [values]);
  }
}
