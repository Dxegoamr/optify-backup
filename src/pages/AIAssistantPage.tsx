import { useState } from 'react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { QuickActions } from '@/components/ai-assistant/QuickActions';
import { AIAssistant } from '@/components/ai-assistant/AIAssistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, User, Send, MessageCircle, RotateCcw, Brain, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AIAssistantPage() {
  const { messages, isLoading, sendMessage, clearHistory, getQuickActions } = useAIAssistant();
  const [inputMessage, setInputMessage] = useState('');
  const [showFullChat, setShowFullChat] = useState(false);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                Assistente AI
              </h1>
              <Badge variant="secondary" className="text-sm">
                <Sparkles className="h-4 w-4 mr-1" />
                Powered by GPT-4o Mini
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Seu assistente pessoal para operações no sistema Optify
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFullChat(!showFullChat)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {showFullChat ? 'Ocultar Chat' : 'Mostrar Chat'}
            </Button>
            <Button
              variant="outline"
              onClick={clearHistory}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar Histórico
            </Button>
          </div>
        </div>

        <Tabs defaultValue="quick-actions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quick-actions">Ações Rápidas</TabsTrigger>
            <TabsTrigger value="chat">Chat Completo</TabsTrigger>
            <TabsTrigger value="help">Ajuda</TabsTrigger>
          </TabsList>

          <TabsContent value="quick-actions" className="space-y-4">
            <QuickActions onAction={sendMessage} />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Conversa com o Assistente
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Área de mensagens */}
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 py-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-12">
                        <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium mb-2">Olá! Como posso ajudá-lo?</h3>
                        <p className="text-sm">
                          Use as ações rápidas ao lado ou digite sua pergunta abaixo
                        </p>
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
                            className={`rounded-lg px-4 py-3 ${
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
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-sm text-muted-foreground">Pensando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input area */}
                <div className="border-t p-6">
                  <div className="flex gap-3">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua pergunta sobre o sistema..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="px-6"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Pressione Enter para enviar • Shift+Enter para nova linha
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Como usar o Assistente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">💬 Chat Direto</h4>
                    <p className="text-sm text-muted-foreground">
                      Digite perguntas em português sobre qualquer funcionalidade do sistema.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">⚡ Ações Rápidas</h4>
                    <p className="text-sm text-muted-foreground">
                      Use os botões de ações rápidas para obter ajuda específica sobre operações comuns.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">🧠 Memória Inteligente</h4>
                    <p className="text-sm text-muted-foreground">
                      O assistente lembra das suas últimas 10 mensagens para dar respostas mais contextuais.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exemplos de Perguntas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sobre Funcionários:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "Como adicionar um funcionário?"</li>
                      <li>• "Como editar dados de um colaborador?"</li>
                      <li>• "Como remover um funcionário?"</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sobre Transações:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "Como registrar uma venda?"</li>
                      <li>• "Como adicionar uma despesa?"</li>
                      <li>• "Como filtrar transações?"</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sobre Sistema:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "Como funciona o sistema?"</li>
                      <li>• "Como gerar relatórios?"</li>
                      <li>• "Como definir metas?"</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
