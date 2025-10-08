import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees } from '@/hooks/useFirestore';
import type { Payment } from '@/types';

const Pagamentos = () => {
  const { user } = useFirebaseAuth();
  const { data: employees = [] } = useEmployees(user?.uid || '');
  
  // Criar payments baseado nos funcionários ativos
  const payments: Payment[] = employees.map(emp => ({
    id: emp.id,
    employeeId: emp.id,
    employeeName: emp.name,
    amount: emp.salary || 0,
    status: Math.random() > 0.5 ? 'paid' : 'pending',
    dueDate: new Date().toISOString(),
    paidDate: Math.random() > 0.5 ? new Date().toISOString() : undefined
  }));
  
  const [paymentStates, setPaymentStates] = useState<{[key: string]: 'paid' | 'pending'}>({});

  const togglePaymentStatus = (id: string) => {
    setPaymentStates(prev => ({
      ...prev,
      [id]: prev[id] === 'paid' ? 'pending' : 'paid'
    }));
    toast.success('Status atualizado!');
  };

  // Função para obter o status atual do pagamento
  const getPaymentStatus = (payment: Payment) => {
    return paymentStates[payment.id] || payment.status;
  };

  const totalPending = payments.filter(p => getPaymentStatus(p) === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => getPaymentStatus(p) === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Pagamentos</h1>
          <p className="text-muted-foreground">Gerencie os pagamentos dos funcionários</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 shadow-card">
            <p className="text-sm text-muted-foreground mb-2">Total a Pagar</p>
            <p className="text-3xl font-bold text-warning">R$ {totalPending.toLocaleString('pt-BR')}</p>
          </Card>
          <Card className="p-6 shadow-card">
            <p className="text-sm text-muted-foreground mb-2">Total Pago</p>
            <p className="text-3xl font-bold text-success">R$ {totalPaid.toLocaleString('pt-BR')}</p>
          </Card>
          <Card className="p-6 shadow-card">
            <p className="text-sm text-muted-foreground mb-2">Total Geral</p>
            <p className="text-3xl font-bold">R$ {(totalPending + totalPaid).toLocaleString('pt-BR')}</p>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Funcionário</th>
                  <th className="text-left p-4 font-semibold">Valor</th>
                  <th className="text-left p-4 font-semibold">Vencimento</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{payment.employeeName}</td>
                    <td className="p-4">
                      <Input
                        type="number"
                        value={payment.amount}
                        className="w-32"
                        onChange={(e) => {
                          setPayments(payments.map(p => 
                            p.id === payment.id ? { ...p, amount: parseFloat(e.target.value) } : p
                          ));
                        }}
                      />
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <Badge variant={getPaymentStatus(payment) === 'paid' ? 'default' : 'secondary'}>
                        {getPaymentStatus(payment) === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant={getPaymentStatus(payment) === 'paid' ? 'outline' : 'default'}
                        onClick={() => togglePaymentStatus(payment.id)}
                      >
                        {getPaymentStatus(payment) === 'paid' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Exportar</Button>
          <Button variant="success">Processar Pagamentos</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Pagamentos;
