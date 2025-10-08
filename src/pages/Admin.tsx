import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

const Admin = () => {
  const mockUsers = [
    { id: '1', name: 'João Silva', email: 'joao@example.com', plan: 'ultimate', status: 'active' },
    { id: '2', name: 'Maria Santos', email: 'maria@example.com', plan: 'standard', status: 'active' },
    { id: '3', name: 'Pedro Costa', email: 'pedro@example.com', plan: 'free', status: 'inactive' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários e configurações do sistema</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total de Usuários"
            value="1.247"
            icon={Users}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Usuários Ativos"
            value="986"
            icon={Activity}
          />
          <StatCard
            title="Receita Total"
            value="R$ 127.450"
            icon={DollarSign}
            trend={{ value: 8.3, isPositive: true }}
          />
          <StatCard
            title="Taxa de Crescimento"
            value="23.5%"
            icon={TrendingUp}
            trend={{ value: 5.2, isPositive: true }}
          />
        </div>

        {/* User Management */}
        <Card className="shadow-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Usuários do Sistema</h3>
              <div className="flex gap-2">
                <Input placeholder="Buscar usuários..." className="w-64" />
                <Button variant="outline">Filtros</Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Usuário</th>
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-left p-4 font-semibold">Plano</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <Badge variant="default" className="capitalize">
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Editar</Button>
                        <Button size="sm" variant="outline">Ver Detalhes</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Planos</h3>
            <div className="space-y-3">
              {['Free', 'Standard', 'Medium', 'Ultimate'].map((plan, i) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{plan}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${[45, 30, 15, 10][i]}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {[45, 30, 15, 10][i]}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
            <div className="space-y-3">
              {[
                { action: 'Novo usuário registrado', time: '2 min atrás' },
                { action: 'Upgrade para Standard', time: '15 min atrás' },
                { action: 'Cancelamento de plano', time: '1 hora atrás' },
                { action: 'Novo usuário registrado', time: '2 horas atrás' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm">{activity.action}</span>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
