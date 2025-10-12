// Configuração do Mercado Pago
export const mercadoPagoConfig = {
  accessToken: import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '',
  publicKey: import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || '',
  clientId: import.meta.env.VITE_MERCADO_PAGO_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_MERCADO_PAGO_CLIENT_SECRET || '',
  environment: import.meta.env.VITE_MERCADO_PAGO_ENVIRONMENT || 'sandbox', // 'sandbox' ou 'production'
};

// URLs da API do Mercado Pago
export const mercadoPagoUrls = {
  sandbox: {
    api: 'https://api.mercadopago.com',
    oauth: 'https://auth.mercadopago.com/authorization',
  },
  production: {
    api: 'https://api.mercadopago.com',
    oauth: 'https://auth.mercadopago.com/authorization',
  }
};

export const getMercadoPagoUrl = () => {
  return mercadoPagoUrls[mercadoPagoConfig.environment as keyof typeof mercadoPagoUrls] || mercadoPagoUrls.sandbox;
};








