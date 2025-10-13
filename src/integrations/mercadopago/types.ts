// Tipos para integração com Mercado Pago

export interface MercadoPagoPayment {
  id: string;
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail: string;
  currency_id: string;
  description: string;
  external_reference: string;
  date_approved: string | null;
  date_created: string;
  date_last_updated: string;
  date_of_expiration: string | null;
  money_release_date: string | null;
  operation_type: string;
  issuer_id: string;
  payment_method_id: string;
  payment_type_id: string;
  collector_id: number;
  payer: {
    type: string;
    id: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
    phone: {
      area_code: string;
      number: string;
      extension: string;
    };
    first_name: string;
    last_name: string;
    entity_type: string;
  };
  metadata: Record<string, any>;
  order: {
    id: string;
    type: string;
  };
  external_reference: string;
  transaction_amount: number;
  transaction_amount_refunded: number;
  coupon_amount: number;
  differential_pricing_id: string;
  deduction_schema: string;
  transaction_details: {
    payment_method_reference_id: string;
    net_received_amount: number;
    total_paid_amount: number;
    overpaid_amount: number;
    external_resource_url: string;
    installment_amount: number;
    financial_institution: string;
    payable_deferral_period: string;
    acquirer_reference: string;
  };
  fee_details: Array<{
    type: string;
    amount: number;
    fee_payer: string;
  }>;
  captured: boolean;
  binary_mode: boolean;
  call_for_authorize_id: string;
  statement_descriptor: string;
  installments: number;
  card: {
    first_six_digits: string;
    last_four_digits: string;
    expiration_month: number;
    expiration_year: number;
    date_created: string;
    date_last_updated: string;
    cardholder: {
      name: string;
      identification: {
        number: string;
        type: string;
      };
    };
  };
  notification_url: string;
  processing_mode: string;
  merchant_account_id: string;
  merchant_number: string;
  acquirer: string;
  marketplace: string;
  corporation_id: string;
  brand_id: string;
  taxes_amount: number;
  counter_currency: string;
  shipping_amount: number;
  pos_id: string;
  store_id: string;
  integrator_id: string;
  platform_id: string;
  custom_action: string;
  additional_info: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      picture_url: string;
      category_id: string;
      quantity: number;
      unit_price: number;
    }>;
    payer: {
      first_name: string;
      last_name: string;
      phone: {
        area_code: string;
        number: string;
      };
      address: {
        street_name: string;
        street_number: number;
        zip_code: string;
      };
    };
    shipments: {
      receiver_address: {
        zip_code: string;
        state_name: string;
        city_name: string;
        street_name: string;
        street_number: number;
      };
    };
  };
  application_fee: number;
  money_release_schema: string;
  taxes: Array<{
    type: string;
    value: number;
  }>;
}

export interface CreatePaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
  notification_url?: string;
  statement_descriptor?: string;
  installments?: number;
  metadata?: Record<string, any>;
}

export interface CreatePaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  date_created: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoWebhook {
  id: string;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: string;
  user_id: string;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}









