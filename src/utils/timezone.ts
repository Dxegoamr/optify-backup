/**
 * Configurações de fuso horário para o sistema
 * Padrão: America/Sao_Paulo (GMT-3)
 */

// Configurar o fuso horário padrão do sistema
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// Configurar o locale padrão
export const DEFAULT_LOCALE = 'pt-BR';

/**
 * Configura o fuso horário padrão do sistema
 */
export const configureTimezone = () => {
  // Configurar o fuso horário padrão para o ambiente
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    // Configurar o fuso horário padrão para formatação de datas
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      return originalDateTimeFormat(locales, {
        ...options,
        timeZone: options?.timeZone || DEFAULT_TIMEZONE
      });
    } as any;
  }
};

/**
 * Obtém a data atual no fuso horário de São Paulo
 */
export const getCurrentDateInSaoPaulo = (): Date => {
  const now = new Date();
  // Obter a data atual no fuso horário de São Paulo
  const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  return saoPauloDate;
};

/**
 * Converte uma data para o fuso horário de São Paulo
 */
export const convertToSaoPauloTimezone = (date: Date): Date => {
  return new Date(date.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
};

/**
 * Formata uma data no fuso horário de São Paulo
 */
export const formatDateInSaoPaulo = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    ...options
  });
};

/**
 * Formata uma data e hora no fuso horário de São Paulo
 */
export const formatDateTimeInSaoPaulo = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  return date.toLocaleString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    ...options
  });
};

/**
 * Obtém a data atual como string no formato YYYY-MM-DD no fuso horário de São Paulo
 */
export const getCurrentDateStringInSaoPaulo = (): string => {
  const now = new Date();
  // Usar o fuso horário de São Paulo para obter a data correta
  const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
  
  // Formatar como YYYY-MM-DD
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  const day = String(saoPauloDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Obtém o timestamp atual no fuso horário de São Paulo
 */
export const getCurrentTimestampInSaoPaulo = (): number => {
  return getCurrentDateInSaoPaulo().getTime();
};

/**
 * Cria uma data a partir de uma string no fuso horário de São Paulo
 */
export const createDateInSaoPaulo = (dateString: string): Date => {
  const date = new Date(dateString);
  return convertToSaoPauloTimezone(date);
};

/**
 * Obtém o início do dia no fuso horário de São Paulo
 */
export const getStartOfDayInSaoPaulo = (date: Date = new Date()): Date => {
  const saoPauloDate = convertToSaoPauloTimezone(date);
  saoPauloDate.setHours(0, 0, 0, 0);
  return saoPauloDate;
};

/**
 * Obtém o fim do dia no fuso horário de São Paulo
 */
export const getEndOfDayInSaoPaulo = (date: Date = new Date()): Date => {
  const saoPauloDate = convertToSaoPauloTimezone(date);
  saoPauloDate.setHours(23, 59, 59, 999);
  return saoPauloDate;
};
