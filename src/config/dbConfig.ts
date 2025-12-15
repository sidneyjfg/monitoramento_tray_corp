// src/config/dbConfig.ts
import mysql from "mysql2/promise";
import { config } from "./index";

export const sqlMonitoramentoPool = mysql.createPool({
  host: config.DB_MONITORAMENTO_HOST,
  port: config.DB_MONITORAMENTO_PORT,
  user: config.DB_MONITORAMENTO_USER,
  password: config.DB_MONITORAMENTO_PASSWORD,
  database: config.DB_NAME_MONITORAMENTO,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

export const getMonitoramentoConnection = () => {
  return sqlMonitoramentoPool.getConnection();
};

export const validateAndCreateTables = async () => {
  const conn = await getMonitoramentoConnection();

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS temp_products (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,

        produtoVarianteId BIGINT NOT NULL,
        produtoId BIGINT NOT NULL,
        idPaiExterno BIGINT NULL,

        sku VARCHAR(191) NOT NULL,
        nome VARCHAR(500) NOT NULL,
        nomeProdutoPai VARCHAR(500) NULL,

        precoCusto DECIMAL(10,2) NULL,
        precoDe DECIMAL(10,2) NULL,
        precoPor DECIMAL(10,2) NULL,

        ean VARCHAR(100) NULL,
        
        centroDistribuicaoId INT NOT NULL,
        estoqueFisico INT NOT NULL,
        estoqueReservado INT NOT NULL,
        alertaEstoque INT NOT NULL,

        dataCriacao DATETIME NULL,
        dataAtualizacao DATETIME NULL,

        parentId BIGINT NULL,

        raw_payload JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_centroDistribuicaoId (centroDistribuicaoId),
        INDEX idx_produtoVarianteId (produtoVarianteId),
        INDEX idx_produtoId (produtoId),
        INDEX idx_sku (sku)
      );
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        log_level VARCHAR(50),
        log_message TEXT,
        created_at DATETIME NOT NULL
      );
    `);

    console.log("✅ Tabelas temp_products e logs verificadas/criadas com sucesso.");
  } catch (error) {
    console.error("❌ Erro ao criar tabela temp_products:", error);
    throw error;
  } finally {
    conn.release();
  }
};
