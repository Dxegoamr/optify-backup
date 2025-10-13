import { useState, useEffect, useRef } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { aiAssistantService, ChatMessage } from '@/core/services/ai-assistant.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Send, MessageCircle, X, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AIAssistantProps {
  className?: string;
}

export const AIAssistant = ({ className }: AIAssistantProps) => {
  const { user } = useFirebaseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar mensagens quando o componente abre
  useEffect(() => {
    if (isOpen && user?.uid) {
      loadMessages();
    }
  }, [isOpen, user?.uid]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus no input quando abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadMessages = async () => {
    if (!user?.uid) return;
    
    try {
      const recentMessages = await aiAssistantService.getRecentMessages(user.uid);
      setMessages(recentMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar histórico de conversas');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user?.uid || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Adicionar mensagem do usuário imediatamente
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        userId: user.uid
      };
      
      setMessages(prev => [...prev, userMsg]);

      // Processar mensagem e obter resposta
      const response = await aiAssistantService.processUserMessage(user.uid, userMessage);
      
      // Adicionar resposta do assistente
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        userId: user.uid
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = async () => {
    if (!user?.uid) return;
    
    try {
      await aiAssistantService.clearConversationHistory(user.uid);
      setMessages([]);
      toast.success('Histórico de conversas limpo');
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      toast.error('Erro ao limpar histórico');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) return null;

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <Card className={`fixed bottom-6 right-6 z-50 w-96 h-[500px] shadow-2xl ${className}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Assistente Optify</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  GPT-4o Mini
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-8 w-8 p-0"
                  title="Limpar histórico"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col h-[400px] p-0">
            {/* Área de mensagens */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm">Olá! Como posso ajudá-lo hoje?</p>
                    <p className="text-xs mt-1">Pergunte sobre funcionários, transações, metas ou relatórios</p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    )}

                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                        {message.role === 'user' && (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                        {message.metadata?.operation && (
                          <Badge variant="secondary" className="text-xs">
                            {message.metadata.operation}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-xs text-muted-foreground">Digitando...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pressione Enter para enviar • Shift+Enter para nova linha
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AIAssistant;
