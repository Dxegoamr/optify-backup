import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { DataExport } from '@/components/settings/DataExport';

const Settings = () => {
  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
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
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações de Email</Label>
                    <p className="text-sm text-muted-foreground">Receba atualizações por email</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pagamentos Pendentes</Label>
                    <p className="text-sm text-muted-foreground">Alertas sobre pagamentos não realizados</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Metas Atingidas</Label>
                    <p className="text-sm text-muted-foreground">Notificação ao atingir metas mensais</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Novos Funcionários</Label>
                    <p className="text-sm text-muted-foreground">Alerta quando um novo funcionário é cadastrado</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Relatórios Semanais</Label>
                    <p className="text-sm text-muted-foreground">Resumo semanal enviado por email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
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
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
