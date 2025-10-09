/**
 * Utilitários para manipulação de datas no fuso horário de Brasília
 */

// Função para obter a data atual no fuso horário de Brasília
export const getCurrentDateInBrasilia = (): Date => {
  const now = new Date();
  // Brasília está UTC-3 (ou UTC-2 durante horário de verão)
  // Vamos usar UTC-3 como padrão
  const brasiliaOffset = -3 * 60; // -3 horas em minutos
  const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 1000));
  return brasiliaTime;
};

// Função para formatar data no padrão brasileiro
export const formatDateInBrasilia = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Função para formatar data e hora no padrão brasileiro
export const formatDateTimeInBrasilia = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Função para formatar apenas a hora no padrão brasileiro
export const formatTimeInBrasilia = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Função para converter timestamp do Firebase para data de Brasília
export const convertFirebaseTimestampToBrasilia = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  
  // Se for um timestamp do Firebase
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  
  // Se for uma string de data
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  // Se for um número (timestamp Unix)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  return new Date();
};

// Função para obter a string de data no formato YYYY-MM-DD para Brasília
export const getDateStringInBrasilia = (date?: Date): string => {
  const targetDate = date || getCurrentDateInBrasilia();
  return targetDate.toISOString().split('T')[0];
};
