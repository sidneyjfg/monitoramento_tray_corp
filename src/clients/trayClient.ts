import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
export type TrayFetchResult = {
  products: any[];
  pages: number;
};


export async function fetchTrayProducts(): Promise<TrayFetchResult> {
  const baseUrl = process.env.TRAY_URL;
  const token = process.env.TRAY_TOKEN;

  if (!baseUrl) {
    throw new Error("TRAY_URL não configurada");
  }

  let page = 1;
  const allProducts: any[] = [];

  while (true) {
    const finalUrl = `${baseUrl.replace(/\/+$/, "")}/produtos?pagina=${page}`;

    const response = await axios.get(finalUrl, {
      headers: {
        Authorization: `Basic ${token}`,
        Accept: "application/json",
      },
    });

    const data = response.data;

    // API deve retornar um array; se não for → erro
    if (!Array.isArray(data)) {
      console.error("⚠ Retorno inesperado:", data);
      throw new Error("A API Tray/Fbits não retornou um array de produtos.");
    }

    // Se não houver produtos, parar a paginação
    if (data.length === 0) {
      console.log(`🔚 Nenhum produto na página ${page}. Encerrando paginação.`);
      break;
    }

    console.log(`📦 Página ${page}: ${data.length} produtos recebidos.`);

    allProducts.push(...data);

    page++; // próxima página
  }

  console.log(`✅ Total de produtos coletados: ${allProducts.length}`);
  const totalPages = page - 1;

  return {
    products: allProducts,
    pages: totalPages
  };
}
