import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Copy, Check, TrendingUp, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const Afiliados = () => {
  const { user } = useFirebaseAuth();
  const [copied, setCopied] = useState(false);
  
  const affiliateLink = `https://optify.app/ref/${user?.affiliateCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const mockStats = {
    totalReferrals: 12,
    activeReferrals: 8,
    totalEarnings: 450,
    pendingEarnings: 120
  };

  const mockHistory = [
    { date: '2024-10-01', name: 'João Silva', plan: 'Standard', commission: 49, status: 'paid' },
    { date: '2024-09-25', name: 'Maria Santos', plan: 'Medium', commission: 99, status: 'paid' },
    { date: '2024-09-20', name: 'Pedro Costa', plan: 'Ultimate', commission: 199, status: 'pending' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Sistema de Afiliados</h1>
          <p className="text-muted-foreground">Ganhe comissões indicando novos usuários</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-muted-foreground">Total de Indicações</p>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{mockStats.totalReferrals}</p>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-muted-foreground">Indicações Ativas</p>
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold text-success">{mockStats.activeReferrals}</p>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-muted-foreground">Total Ganho</p>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">R$ {mockStats.totalEarnings}</p>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold text-warning">R$ {mockStats.pendingEarnings}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="link" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="earnings">Ganhos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="link">
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-4">Seu Link de Referência</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compartilhe este link para ganhar 10% de comissão sobre os planos pagos
              </p>
              <div className="flex gap-2">
                <Input value={affiliateLink} readOnly className="flex-1" />
                <Button onClick={copyToClipboard} variant="outline" className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Performance Mensal</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-2xl font-bold">66.7%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Cliques no Link</p>
                    <p className="text-2xl font-bold">18</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="p-6 shadow-card">
              <h3 className="text-lg font-semibold mb-6">Resumo de Ganhos</h3>
              <div className="space-y-4">
                {['Janeiro', 'Fevereiro', 'Março'].map((month, i) => (
                  <div key={month} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="font-medium">{month}</span>
                    <span className="text-success font-bold">R$ {[150, 180, 120][i]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Data</th>
                      <th className="text-left p-4 font-semibold">Usuário</th>
                      <th className="text-left p-4 font-semibold">Plano</th>
                      <th className="text-left p-4 font-semibold">Comissão</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockHistory.map((item, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 font-medium">{item.name}</td>
                        <td className="p-4">{item.plan}</td>
                        <td className="p-4 font-semibold text-success">R$ {item.commission}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'paid' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {item.status === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Afiliados;
