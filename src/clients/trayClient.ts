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

const RATE_LIMIT = 120;       // 120 requisições por minuto
const WINDOW_MS = 60000;      // 1 minuto

export async function fetchTrayProducts(): Promise<TrayFetchResult> {
  const baseUrl = process.env.TRAY_URL;
  const token = process.env.TRAY_TOKEN;

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

    // ⏳ Se atingir o limite de 120 req/min
    if (requestCount >= RATE_LIMIT) {
      const waitMs = WINDOW_MS - (now - windowStart);
      console.log(`⏸ Atingimos ${RATE_LIMIT} requisições. Pausando por ${(waitMs / 1000).toFixed(2)}s para evitar 429.`);
      await sleep(waitMs);
      continue;
    }

    const finalUrl = `${baseUrl.replace(/\/+$/, "")}/produtos?pagina=${page}`;
    console.log(`🔎 Buscando página ${page}: ${finalUrl}`);

    try {
      requestCount++; // 📌 registra requisição

      const response = await axios.get(finalUrl, {
        headers: {
          Authorization: `Basic ${token}`,
          Accept: "application/json",
        },
        timeout: 15000,
      });

      const data = response.data;

      if (!Array.isArray(data)) {
        console.error(`⚠ Página ${page} retornou formato inesperado.`, data);
        break;
      }

      if (data.length === 0) {
        console.log(`🔚 Página ${page} vazia. Encerrando paginação.`);
        break;
      }

      console.log(`📦 Página ${page}: ${data.length} produtos recebidos.`);
      allProducts.push(...data);
      page++;

    } catch (err: any) {
      const status = err.response?.status;
      const body = err.response?.data;
      const message = err.message;

      console.error(`❌ Erro ao buscar página ${page}`);
      console.error(`   → Status: ${status ?? "SEM STATUS"}`);
      console.error(`   → Body:`, body ?? "(sem body)");
      console.error(`   → Mensagem:`, message);

      // 🔁 RETRY com backoff exponencial
      if (status === 429) {
        let retryCount = 0;
        const maxRetries = 5;

        while (retryCount < maxRetries) {
          retryCount++;

          const backoffSeconds = Math.min(60, 5 * Math.pow(2, retryCount));
          console.log(`⏳ Rate limit detectado! Retry ${retryCount}/${maxRetries}. Aguardando ${backoffSeconds}s...`);

          await sleep(backoffSeconds * 1000);

          try {
            const retryResponse = await axios.get(finalUrl, {
              headers: {
                Authorization: `Basic ${token}`,
                Accept: "application/json",
              },
              timeout: 15000,
            });

            const retryData = retryResponse.data;

            if (!Array.isArray(retryData)) {
              console.error(`⚠ Página ${page} retornou formato inesperado após retry.`);
              break;
            }

            if (retryData.length === 0) {
              console.log(`🔚 Página ${page} vazia após retry. Encerrando.`);
              break;
            }

            console.log(`📦 Página ${page} carregada após retry (${retryCount}).`);
            allProducts.push(...retryData);
            page++;

            // Continua normalmente no loop principal
            continue;
          } catch {
            console.error(`❌ Falha no retry ${retryCount}.`);
          }
        }

        // ❌ Se mesmo assim continuar 429, aborta
        console.log(`🛑 Rate limit persistente mesmo após ${maxRetries} tentativas. Abortando sincronização para evitar loop infinito.`);
        break;
      }

      if (status === 404) {
        console.log(`🔚 Página ${page} não existe (404). Fim.`);
        break;
      }

      if (status === 503) {
        console.log(`🛑 API indisponível (503). Abortando sincronização.`);
        break;
      }

      throw new Error(`Erro ao buscar página ${page}: ${message}`);
    }
  }

  console.log(`✅ Total de produtos coletados: ${allProducts.length}`);
  const totalPages = page - 1;

  return {
    products: allProducts,
    pages: totalPages,
  };
}
