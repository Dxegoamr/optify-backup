/**
 * Utilitários para formatação de valores monetários
 */

/**
 * Formata um valor numérico como moeda brasileira (R$)
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como R$ X.XXX,XX
 */
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formata um valor numérico como moeda brasileira com símbolo R$
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como R$ X.XXX,XX
 */
export const formatCurrencyWithSymbol = (value: number): string => {
  return `R$ ${formatCurrency(value)}`;
};

/**
 * Formata um valor usando Intl.NumberFormat com estilo de moeda
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como R$ X.XXX,XX
 */
export const formatCurrencyIntl = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata um valor para exibição em gráficos (valores grandes em K)
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como R$ X,XX ou R$ X,XK para valores grandes
 */
export const formatCurrencyForChart = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrencyWithSymbol(value);
};

