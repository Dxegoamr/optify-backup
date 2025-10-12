import { z } from 'zod';

/**
 * Schema para transações de planos
 */
export const TransactionPlanSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  userEmail: z.string().email('Email inválido'),
  userName: z.string().min(1, 'Nome do usuário é obrigatório'),
  planId: z.enum(['free', 'standard', 'medium', 'ultimate'], {
    errorMap: () => ({ message: 'Plano inválido' }),
  }),
  amount: z.number().min(0, 'Valor não pode ser negativo'),
  billingType: z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: 'Tipo de cobrança inválido' }),
  }),
  status: z.enum(['pending', 'completed', 'failed', 'refunded'], {
    errorMap: () => ({ message: 'Status inválido' }),
  }).optional(),
  paymentProvider: z.string().default('mercadopago'),
  transactionId: z.string().optional(),
  externalReference: z.string().optional(),
});

export type TransactionPlan = z.infer<typeof TransactionPlanSchema>;

/**
 * Schema para perfil de usuário
 */
export const UserProfileSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  displayName: z.string().optional(),
  plano: z.enum(['free', 'standard', 'medium', 'ultimate']).default('free'),
  periodo: z.enum(['monthly', 'annual']).optional(),
  isActive: z.boolean().default(true),
  isSubscriber: z.boolean().default(false),
  funcionariosPermitidos: z.number().int().min(1).default(1),
  subscriptionStartDate: z.date().optional(),
  subscriptionEndDate: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Schema para eventos de webhook
 */
export const WebhookEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID é obrigatório'),
  type: z.string().min(1, 'Tipo de evento é obrigatório'),
  data: z.record(z.any()),
  timestamp: z.date().optional(),
  processed: z.boolean().default(false),
  processingAttempts: z.number().int().min(0).default(0),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Schema para funcionários
 */
export const EmployeeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').optional(),
  position: z.string().min(1, 'Cargo é obrigatório').max(50, 'Cargo muito longo'),
  salary: z.number().min(0, 'Salário não pode ser negativo').max(1000000, 'Salário muito alto'),
  hireDate: z.date(),
  active: z.boolean().default(true),
  phone: z.string().optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido').optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;

/**
 * Schema para plataformas
 */
export const PlatformSchema = z.object({
  name: z.string().min(1, 'Nome da plataforma é obrigatório'),
  type: z.enum(['delivery', 'ecommerce', 'marketplace', 'other']),
  apiKey: z.string().optional(),
  isActive: z.boolean().default(true),
  credentials: z.record(z.string()).optional(),
  lastSync: z.date().optional(),
});

export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Schema para transações
 */
export const TransactionSchema = z.object({
  employeeId: z.string().min(1, 'ID do funcionário é obrigatório'),
  platformId: z.string().min(1, 'ID da plataforma é obrigatório'),
  amount: z.number(),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().min(1, 'Descrição é obrigatória').max(200, 'Descrição muito longa'),
  date: z.date(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Schema para configurações do usuário
 */
export const UserConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']).default('pt-BR'),
  timezone: z.string().default('America/Sao_Paulo'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
  }).optional(),
  preferences: z.record(z.any()).optional(),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;

/**
 * Schema para solicitação de exclusão de usuário
 */
export const DeleteUserRequestSchema = z.object({
  targetUserId: z.string().min(1, 'ID do usuário é obrigatório'),
  reason: z.string().max(500, 'Motivo muito longo').optional(),
  confirmation: z.literal(true, {
    errorMap: () => ({ message: 'Confirmação é obrigatória' }),
  }),
});

export type DeleteUserRequest = z.infer<typeof DeleteUserRequestSchema>;

/**
 * Schema para solicitação de definição de claims
 */
export const SetClaimRequestSchema = z.object({
  uid: z.string().min(1, 'UID é obrigatório'),
  isAdmin: z.boolean(),
  reason: z.string().max(200, 'Motivo muito longo').optional(),
});

export type SetClaimRequest = z.infer<typeof SetClaimRequestSchema>;

/**
 * Schema para preference do Mercado Pago
 */
export const PaymentPreferenceSchema = z.object({
  userId: z.string().min(1, 'User ID é obrigatório'),
  userEmail: z.string().email('Email inválido'),
  userName: z.string().min(1, 'Nome é obrigatório'),
  planId: z.enum(['free', 'standard', 'medium', 'ultimate']),
  billingType: z.enum(['monthly', 'annual']),
});

export type PaymentPreference = z.infer<typeof PaymentPreferenceSchema>;

/**
 * Helper para validar dados com schema Zod
 */
export function validateData<T>(schema: z.Schema<T>, data: any): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validação falhou: ${messages}`);
    }
    throw error;
  }
}

/**
 * Helper para validar dados com mensagem customizada
 */
export function safeValidate<T>(
  schema: z.Schema<T>,
  data: any
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro desconhecido na validação'] };
  }
}
