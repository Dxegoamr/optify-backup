import { GestorResumoFinanceiro, GestorTransacaoPessoal, GestorCategoria, GestorConfiguracoes } from '@/types/gestorCaixa';

const BASE_URL = '/api/gestor-caixa';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Erro ao comunicar com o gestor de caixa');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export class GestorCaixaService {
  static async getResumo(): Promise<GestorResumoFinanceiro> {
    return request<GestorResumoFinanceiro>(`${BASE_URL}/resumo`);
  }

  static async getTransacoes(): Promise<GestorTransacaoPessoal[]> {
    return request<GestorTransacaoPessoal[]>(`${BASE_URL}/transacoes`);
  }

  static async createTransacao(data: Partial<GestorTransacaoPessoal>): Promise<GestorTransacaoPessoal> {
    return request<GestorTransacaoPessoal>(`${BASE_URL}/transacoes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateTransacao(id: string, data: Partial<GestorTransacaoPessoal>): Promise<GestorTransacaoPessoal> {
    return request<GestorTransacaoPessoal>(`${BASE_URL}/transacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteTransacao(id: string): Promise<void> {
    await request<void>(`${BASE_URL}/transacoes/${id}`, { method: 'DELETE' });
  }

  static async getCategorias(): Promise<GestorCategoria[]> {
    return request<GestorCategoria[]>(`${BASE_URL}/categorias`);
  }

  static async createCategoria(data: Partial<GestorCategoria>): Promise<GestorCategoria> {
    return request<GestorCategoria>(`${BASE_URL}/categorias`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCategoria(id: string, data: Partial<GestorCategoria>): Promise<GestorCategoria> {
    return request<GestorCategoria>(`${BASE_URL}/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteCategoria(id: string): Promise<void> {
    await request<void>(`${BASE_URL}/categorias/${id}`, { method: 'DELETE' });
  }

  static async getConfiguracoes(): Promise<GestorConfiguracoes> {
    return request<GestorConfiguracoes>(`${BASE_URL}/configuracoes`);
  }

  static async updateConfiguracoes(data: Partial<GestorConfiguracoes>): Promise<GestorConfiguracoes> {
    return request<GestorConfiguracoes>(`${BASE_URL}/configuracoes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}












