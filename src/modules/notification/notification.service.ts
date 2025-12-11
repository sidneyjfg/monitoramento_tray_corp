import axios from "axios";
import { config } from "../../config";

export class NotificationService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = config.GOOGLE_WEBHOOK_URL ?? "";

    if (!this.webhookUrl) {
      console.warn("⚠ GOOGLE_WEBHOOK_URL não configurada.");
    }
  }

  async sendMessage(message: string) {
    if (!this.webhookUrl) return;

    try {
      await axios.post(this.webhookUrl, {
        text: message
      });
      console.log("📨 Notificação enviada com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao enviar notificação:", err);
    }
  }

  async notifySyncResult({
    totalProducts,
    totalPages,
    durationSeconds
  }: {
    totalProducts: number;
    totalPages: number;
    durationSeconds: number;
  }) {

    const message = `
📦 *Sincronização Tray Finalizada*

- Total de produtos: *${totalProducts}*
- Total de páginas: *${totalPages}*
- Tempo total: *${durationSeconds}s*

✔ Processo concluído com sucesso!
`;

    await this.sendMessage(message);
  }
}

export const notificationService = new NotificationService();
