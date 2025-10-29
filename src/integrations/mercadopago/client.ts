import { mercadoPagoConfig, getMercadoPagoUrl } from './config';
import { CreatePaymentRequest, CreatePaymentResponse, MercadoPagoPayment } from './types';

class MercadoPagoClient {
  private baseUrl: string;
  private accessToken: string;

  constructor() {
    this.baseUrl = getMercadoPagoUrl().api;
    this.accessToken = mercadoPagoConfig.accessToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mercado Pago API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Criar pagamento
  async createPayment(paymentData: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    return this.makeRequest<CreatePaymentResponse>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Buscar pagamento por ID
  async getPayment(paymentId: string): Promise<MercadoPagoPayment> {
    return this.makeRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`);
  }

  // Buscar pagamentos por external_reference
  async getPaymentsByExternalReference(externalReference: string): Promise<MercadoPagoPayment[]> {
    const response = await this.makeRequest<{ results: MercadoPagoPayment[] }>(
      `/v1/payments/search?external_reference=${externalReference}`
    );
    return response.results;
  }

  // Cancelar pagamento
  async cancelPayment(paymentId: string): Promise<MercadoPagoPayment> {
    return this.makeRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  // Reembolsar pagamento
  async refundPayment(paymentId: string, amount?: number): Promise<MercadoPagoPayment> {
    const body = amount ? { amount } : {};
    return this.makeRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Criar preferência de pagamento (para checkout)
  async createPreference(preferenceData: any): Promise<any> {
    return this.makeRequest('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify(preferenceData),
    });
  }

  // Verificar webhook
  async verifyWebhook(webhookData: any): Promise<boolean> {
    try {
      // Implementar verificação de webhook do Mercado Pago
      // Isso geralmente envolve verificar a assinatura
      return true;
    } catch (error) {
      console.error('Erro ao verificar webhook:', error);
      return false;
    }
  }
}

export const mercadoPagoClient = new MercadoPagoClient();















