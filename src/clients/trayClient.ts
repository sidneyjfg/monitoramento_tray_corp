import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export type TrayFetchResult = {
  products: any[];
  pages: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RATE_LIMIT = 120;  // 120 requisições por minuto
const WINDOW_MS = 60000; // janela de 1 minuto

/**
 * 🔁 Função responsável por buscar uma página com retry e backoff
 */
async function fetchPageWithRetry(finalUrl: string, token: string, page: number) {
  let retryCount = 0;
  const maxRetries = 5;

  while (true) {
    try {
      const response = await axios.get(finalUrl, {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: "application/json",
        },
        timeout: 15000,
      });

      return response.data; // 🎯 sucesso → retorna a página

    } catch (err: any) {
      const status = err.response?.status;
      const message = err.message;

      // 👉 Se não for 429, é erro real → lança erro
      if (status !== 429) {
        console.error(`❌ Erro ao buscar página ${page}:`, message);
        throw err;
      }

      // 👉 É 429 (rate limit)
      retryCount++;

      if (retryCount > maxRetries) {
        console.error(`🛑 429 persistente mesmo após ${maxRetries} tentativas. Abortando.`);
        throw new Error("Rate limit persistente.");
      }

      const backoffSeconds = Math.min(60, 5 * Math.pow(2, retryCount));
      console.log(`⏳ Rate limit! Retry ${retryCount}/${maxRetries}. Esperando ${backoffSeconds}s...`);

      await sleep(backoffSeconds * 1000);
    }
  }
}

export async function fetchTrayProducts(): Promise<TrayFetchResult> {
  const baseUrl = process.env.TRAY_URL || "";
  const token = process.env.TRAY_TOKEN || "";

  if (!baseUrl) {
    throw new Error("TRAY_URL não configurada");
  }

  let page = 1;
  const allProducts: any[] = [];

  let requestCount = 0;
  let windowStart = Date.now();

  while (true) {
    const now = Date.now();

    // 🔄 Reinicia a janela se passou 1 minuto
    if (now - windowStart >= WINDOW_MS) {
      requestCount = 0;
      windowStart = now;
      console.log("🆕 Reiniciando janela de rate limit (novo minuto).");
    }

    // ⏳ Se atingiu 120 req/min, aguardar o próximo minuto
    if (requestCount >= RATE_LIMIT) {
      const waitMs = WINDOW_MS - (now - windowStart);
      console.log(`⏸ Limite de ${RATE_LIMIT} req/min atingido. Pausando ${(waitMs / 1000).toFixed(2)}s...`);
      await sleep(waitMs);
      continue;
    }

    const finalUrl = `${baseUrl.replace(/\/+$/, "")}/produtos?camposAdicionais=estoque?pagina=${page}`;
    console.log(`🔎 Buscando página ${page}: ${finalUrl}`);

    requestCount++; // 📌 Conta a requisição desta página

    try {
      // 🎯 Agora usamos a função segura com retry + backoff
      const data = await fetchPageWithRetry(finalUrl, token, page);

      // 🧪 Validação
      if (!Array.isArray(data)) {
        console.error(`⚠ Página ${page} retornou formato inesperado.`, data);
        break;
      }

      if (data.length === 0) {
        console.log(`🔚 Página ${page} vazia. Fim da paginação.`);
        break;
      }

      console.log(`📦 Página ${page}: ${data.length} produtos recebidos.`);
      allProducts.push(...data);
      page++;

    } catch (err: any) {
      const status = err.response?.status;

      if (status === 404) {
        console.log(`🔚 Página ${page} não existe (404). Encerrando.`);
        break;
      }

      if (status === 429) {
        console.log("🛑 Rate limit irreversível. Abortando sincronização.");
        break;
      }

      console.error("❌ Erro inesperado:", err.message);
      throw err;
    }
  }

  console.log(`✅ Total de produtos coletados: ${allProducts.length}`);
  const totalPages = page - 1;

  return {
    products: allProducts,
    pages: totalPages,
  };
}
