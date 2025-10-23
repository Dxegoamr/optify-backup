import { useState, useEffect, useCallback } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { aiAssistantService, ChatMessage } from '@/core/services/ai-assistant.service';

export const useAIAssistant = () => {
  const { user } = useFirebaseAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar mensagens quando o usuário muda
  useEffect(() => {
    if (user?.uid) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [user?.uid]);

  const loadMessages = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      const recentMessages = await aiAssistantService.getRecentMessages(user.uid);
      setMessages(recentMessages);
    } catch (err) {
      setError('Erro ao carregar mensagens');
      console.error('Erro ao carregar mensagens:', err);
    }
  }, [user?.uid]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user?.uid || !content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Adicionar mensagem do usuário imediatamente
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        userId: user.uid
      };

      setMessages(prev => [...prev, userMessage]);

      // Processar mensagem
      const response = await aiAssistantService.processUserMessage(user.uid, content.trim());

      // Adicionar resposta do assistente
      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        userId: user.uid
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Recarregar mensagens para garantir sincronização
      await loadMessages();

    } catch (err) {
      setError('Erro ao enviar mensagem');
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, loadMessages]);

  const clearHistory = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      await aiAssistantService.clearConversationHistory(user.uid);
      setMessages([]);
    } catch (err) {
      setError('Erro ao limpar histórico');
      console.error('Erro ao limpar histórico:', err);
    }
  }, [user?.uid]);

  const getQuickActions = useCallback(() => {
    return [
      {
        title: 'Cadastrar Funcionário',
        description: 'Como adicionar um novo funcionário?',
        action: () => sendMessage('Como adicionar um novo funcionário?')
      },
      {
        title: 'Registrar Venda',
        description: 'Como registrar uma venda?',
        action: () => sendMessage('Como registrar uma venda?')
      },
      {
        title: 'Definir Meta',
        description: 'Como definir uma meta mensal?',
        action: () => sendMessage('Como definir uma meta mensal?')
      },
      {
        title: 'Gerar Relatório',
        description: 'Como gerar relatórios?',
        action: () => sendMessage('Como gerar relatórios?')
      },
      {
        title: 'Configurar Plataforma',
        description: 'Como adicionar uma plataforma?',
        action: () => sendMessage('Como adicionar uma plataforma de vendas?')
      },
      {
        title: 'Ajuda Geral',
        description: 'Como funciona o sistema?',
        action: () => sendMessage('Como funciona o sistema Optify?')
      }
    ];
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    loadMessages,
    getQuickActions,
    isAvailable: !!user?.uid
  };
};
