import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { DataExport } from '@/components/settings/DataExport';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { 
  getNotificationPreferences, 
  setNotificationPreferences,
  type NotificationPreferences 
} from '@/core/services/notification-preferences.service';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const { user } = useFirebaseAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    paymentsPending: true,
    goal50Percent: true,
    goal75Percent: true,
    goal100Percent: true,
    goalReached: true,
    newEmployees: false,
    weeklyReports: true,
    paymentOverdue: true,
    lowBalance: false,
    highActivity: false,
  });

  // Preferências padrão
  const defaultPrefs: NotificationPreferences = {
    email: true,
    push: true,
    paymentsPending: true,
    goal50Percent: true,
    goal75Percent: true,
    goal100Percent: true,
    goalReached: true,
    newEmployees: false,
    weeklyReports: true,
    paymentOverdue: true,
    lowBalance: false,
    highActivity: false,
  };

  // Buscar preferências do usuário
  const { data: userPreferences, isLoading, error: preferencesError } = useQuery({
    queryKey: ['notification-preferences', user?.uid],
    queryFn: async () => {
      if (!user?.uid) {
        console.error('⚠️ Usuário não autenticado');
        return defaultPrefs;
      }
      try {
        console.log('📥 Buscando preferências para usuário:', user.uid);
        const prefs = await getNotificationPreferences(user.uid);
        console.log('✅ Preferências carregadas:', prefs);
        return prefs;
      } catch (error) {
        console.error('❌ Erro ao buscar preferências:', error);
        // Retornar preferências padrão em caso de erro
        return defaultPrefs;
      }
    },
    enabled: !!user?.uid,
    retry: 1, // Reduzir tentativas
    staleTime: Infinity, // Não revalidar automaticamente
    gcTime: 1000 * 60 * 10, // 10 minutos (antigo cacheTime)
    refetchOnMount: false, // Não refetch ao montar
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnReconnect: false, // Não refetch ao reconectar
  });

  // Atualizar estado quando preferências carregarem (apenas uma vez)
  useEffect(() => {
    if (userPreferences) {
      console.log('🔄 Atualizando estado com preferências:', userPreferences);
      setPreferences(userPreferences);
    }
    // Não fazer nada se não houver preferências - o estado inicial já tem valores padrão
  }, [userPreferences]); // Remover dependências que podem causar loops

  // Mostrar erro se houver (apenas uma vez)
  useEffect(() => {
    if (preferencesError) {
      console.error('❌ Erro nas preferências:', preferencesError);
      toast.error('Erro ao carregar preferências. Usando configurações padrão.');
    }
  }, [preferencesError]);

  // Mutation para salvar preferências
  const savePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      if (!user?.uid) throw new Error('Usuário não autenticado');
      return setNotificationPreferences(user.uid, newPreferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.uid] });
      toast.success('Preferências de notificação salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar preferências:', error);
      toast.error('Erro ao salvar preferências. Tente novamente.');
    },
  });

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSaving(true);
    try {
      await savePreferencesMutation.mutateAsync(preferences);
    } catch (error) {
      // Erro já tratado na mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
            Configurações
          </Badge>
          <h1 className="text-4xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">Personalize suas preferências</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="privacy">Privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Configurações Gerais</h3>
              
              <div className="space-y-6">

                <div className="space-y-2">
                  <Label>Fuso Horário</Label>
                  <select className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>America/Sao_Paulo (GMT-3)</option>
                    <option>America/New_York (GMT-5)</option>
                    <option>Europe/London (GMT+0)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Moeda Padrão</Label>
                  <select className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option>BRL (R$)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Preferências de Interface</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo Compacto</Label>
                    <p className="text-sm text-muted-foreground">Reduz o espaçamento da interface</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Animações</Label>
                    <p className="text-sm text-muted-foreground">Ativa/desativa animações da interface</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Notificações</h3>
              
              {isLoading && !userPreferences ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando preferências...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Notificações Gerais */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Gerais</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notificações de Email</Label>
                        <p className="text-sm text-muted-foreground">Receba atualizações por email</p>
                      </div>
                      <Switch 
                        checked={preferences.email} 
                        onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notificações Push</Label>
                        <p className="text-sm text-muted-foreground">Notificações em tempo real no navegador</p>
                      </div>
                      <Switch 
                        checked={preferences.push} 
                        onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
                      />
                    </div>
                  </div>

                  {/* Metas */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Metas Mensais</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>50% da Meta Atingida</Label>
                        <p className="text-sm text-muted-foreground">Notificação quando atingir 50% da meta mensal</p>
                      </div>
                      <Switch 
                        checked={preferences.goal50Percent} 
                        onCheckedChange={(checked) => handlePreferenceChange('goal50Percent', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>75% da Meta Atingida</Label>
                        <p className="text-sm text-muted-foreground">Notificação quando atingir 75% da meta mensal</p>
                      </div>
                      <Switch 
                        checked={preferences.goal75Percent} 
                        onCheckedChange={(checked) => handlePreferenceChange('goal75Percent', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>100% da Meta Atingida</Label>
                        <p className="text-sm text-muted-foreground">Notificação quando atingir 100% da meta mensal</p>
                      </div>
                      <Switch 
                        checked={preferences.goal100Percent} 
                        onCheckedChange={(checked) => handlePreferenceChange('goal100Percent', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Meta Superada</Label>
                        <p className="text-sm text-muted-foreground">Notificação quando superar a meta mensal</p>
                      </div>
                      <Switch 
                        checked={preferences.goalReached} 
                        onCheckedChange={(checked) => handlePreferenceChange('goalReached', checked)}
                      />
                    </div>
                  </div>

                  {/* Pagamentos */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pagamentos</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Pagamentos Pendentes</Label>
                        <p className="text-sm text-muted-foreground">Alertas sobre pagamentos não realizados</p>
                      </div>
                      <Switch 
                        checked={preferences.paymentsPending} 
                        onCheckedChange={(checked) => handlePreferenceChange('paymentsPending', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Pagamentos Atrasados</Label>
                        <p className="text-sm text-muted-foreground">Alertas sobre pagamentos em atraso</p>
                      </div>
                      <Switch 
                        checked={preferences.paymentOverdue} 
                        onCheckedChange={(checked) => handlePreferenceChange('paymentOverdue', checked)}
                      />
                    </div>
                  </div>

                  {/* Outros */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Outros</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Novos Funcionários</Label>
                        <p className="text-sm text-muted-foreground">Alerta quando um novo funcionário é cadastrado</p>
                      </div>
                      <Switch 
                        checked={preferences.newEmployees} 
                        onCheckedChange={(checked) => handlePreferenceChange('newEmployees', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Saldo Baixo</Label>
                        <p className="text-sm text-muted-foreground">Alerta quando o saldo de uma plataforma estiver baixo</p>
                      </div>
                      <Switch 
                        checked={preferences.lowBalance} 
                        onCheckedChange={(checked) => handlePreferenceChange('lowBalance', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Alta Atividade</Label>
                        <p className="text-sm text-muted-foreground">Notificação quando detectar alta atividade de transações</p>
                      </div>
                      <Switch 
                        checked={preferences.highActivity} 
                        onCheckedChange={(checked) => handlePreferenceChange('highActivity', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Relatórios Semanais</Label>
                        <p className="text-sm text-muted-foreground">Resumo semanal enviado por email</p>
                      </div>
                      <Switch 
                        checked={preferences.weeklyReports} 
                        onCheckedChange={(checked) => handlePreferenceChange('weeklyReports', checked)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Alterar Senha</h3>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>

                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>

                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>

                <Button>Atualizar Senha</Button>
              </div>
            </Card>

            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Privacidade</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">Adiciona uma camada extra de segurança</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sessões Ativas</Label>
                    <p className="text-sm text-muted-foreground">Gerenciar dispositivos conectados</p>
                  </div>
                  <Button variant="outline" size="sm">Ver Sessões</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            {/* Exportação de Dados (LGPD) */}
            <DataExport />

            {/* Política de Privacidade */}
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-4">Política de Privacidade</h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Seus dados são protegidos de acordo com a Lei Geral de Proteção de Dados (LGPD).
                  Coletamos apenas as informações necessárias para o funcionamento do sistema.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/privacidade" target="_blank">
                      Ver Política Completa
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/termos" target="_blank">
                      Ver Termos de Uso
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
