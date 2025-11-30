import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProtectedPageContent } from '@/components/ProtectedPageContent';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useUpdateEmployee } from '@/hooks/useFirestore';
import type { Payment } from '@/types';
import { DollarSign } from 'lucide-react';

const Pagamentos = () => {
  const { user } = useFirebaseAuth();
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const updateEmployee = useUpdateEmployee();
  
  // Estados para edição de salários
  const [salaryValues, setSalaryValues] = useState<{[key: string]: number}>({});
  const [paymentStates, setPaymentStates] = useState<{[key: string]: 'paid' | 'pending'}>({});
  const [savingSalaries, setSavingSalaries] = useState<{[key: string]: boolean}>({});
  const [focusedInputs, setFocusedInputs] = useState<{[key: string]: boolean}>({});
  const timeoutRefs = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  // Estados para filtros de ordenação
  const [sortBy, setSortBy] = useState<'name' | 'salary' | 'payDay'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Inicializar valores de salário
  useEffect(() => {
    const initialSalaries: {[key: string]: number} = {};
    employees.forEach(emp => {
      initialSalaries[emp.id] = Number(emp.salary || 0);
    });
    setSalaryValues(initialSalaries);
  }, [employees]);

  // Cleanup dos timeouts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);
  
  // Função para ordenar funcionários
  const getSortedEmployees = () => {
    return [...employees].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'salary':
          aValue = salaryValues[a.id] || a.salary || 0;
          bValue = salaryValues[b.id] || b.salary || 0;
          break;
        case 'payDay':
          aValue = a.payDay || 1;
          bValue = b.payDay || 1;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Criar payments baseado nos funcionários ordenados
  const sortedEmployees = getSortedEmployees();
  const payments: Payment[] = sortedEmployees.map(emp => ({
    id: emp.id,
    employeeId: emp.id,
    employeeName: emp.name,
    amount: Number(salaryValues[emp.id] || emp.salary || 0),
    status: Math.random() > 0.5 ? 'paid' : 'pending',
    dueDate: new Date().toISOString(),
    paidDate: Math.random() > 0.5 ? new Date().toISOString() : undefined
  }));

  // Função para salvar salário automaticamente
  const saveSalary = async (employeeId: string, newSalary: number) => {
    if (!user?.uid) return;
    
    setSavingSalaries(prev => ({ ...prev, [employeeId]: true }));
    
    try {
      await updateEmployee.mutateAsync({
        userId: user.uid,
        id: employeeId,
        data: {
          salary: newSalary,
          updatedAt: new Date()
        }
      });
      toast.success('Salário atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar salário:', error);
      toast.error('Erro ao atualizar salário. Tente novamente.');
    } finally {
      setSavingSalaries(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  // Função para lidar com mudança de salário
  const handleSalaryChange = (employeeId: string, value: string) => {
    // Remover caracteres não numéricos e converter para número
    const cleanValue = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const newSalary = parseFloat(cleanValue) || 0;
    
    // Atualizar estado local imediatamente
    setSalaryValues(prev => ({
      ...prev,
      [employeeId]: newSalary
    }));
    
    // Limpar timeout anterior se existir
    if (timeoutRefs.current[employeeId]) {
      clearTimeout(timeoutRefs.current[employeeId]);
    }
    
    // Definir novo timeout para salvar após 2 segundos de inatividade
    timeoutRefs.current[employeeId] = setTimeout(() => {
      saveSalary(employeeId, newSalary);
    }, 2000);
  };

  // Função para lidar com foco do input
  const handleInputFocus = (employeeId: string) => {
    setFocusedInputs(prev => ({ ...prev, [employeeId]: true }));
  };

  // Função para lidar com perda de foco do input
  const handleInputBlur = (employeeId: string) => {
    setFocusedInputs(prev => ({ ...prev, [employeeId]: false }));
  };

  // Função para ordenar por clique no cabeçalho
  const handleSortByHeader = (field: 'name' | 'salary' | 'payDay') => {
    if (sortBy === field) {
      // Se já está ordenando por este campo, inverte a ordem
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, define como crescente
      setSortBy(field);
      setSortOrder('asc');
    }
  };

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
      <ProtectedPageContent 
        requiredFeature="payments" 
        featureName="Pagamentos"
        requiredPlan="Medium"
      >
        <div className="space-y-6 animate-fade-in">
          <div>
            <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
              Pagamentos
            </Badge>
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

        {/* Filtros de Ordenação */}
        <Card className="p-4 shadow-card">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Ordenar por:</span>
                <Select value={sortBy} onValueChange={(value: 'name' | 'salary' | 'payDay') => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="salary">Salário</SelectItem>
                    <SelectItem value="payDay">Dia do Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Ordem:</span>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Crescente</SelectItem>
                    <SelectItem value="desc">Decrescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {payments.length} funcionário(s) encontrado(s)
            </div>
          </div>
        </Card>

        {/* Payments Table */}
        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">
                    <button 
                      onClick={() => handleSortByHeader('name')}
                      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                    >
                      Funcionário
                      {sortBy === 'name' && (
                        <span className="text-primary text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button 
                      onClick={() => handleSortByHeader('salary')}
                      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                    >
                      Valor
                      {sortBy === 'salary' && (
                        <span className="text-primary text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">
                    <button 
                      onClick={() => handleSortByHeader('payDay')}
                      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                    >
                      Vencimento
                      {sortBy === 'payDay' && (
                        <span className="text-primary text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{payment.employeeName}</td>
                    <td className="p-4">
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={
                            (salaryValues[payment.employeeId] || 0) === 0 && !focusedInputs[payment.employeeId]
                              ? ''
                              : Number(salaryValues[payment.employeeId] || 0).toFixed(2).replace('.', ',')
                          }
                          className="w-32 pr-8"
                          placeholder="0,00"
                          onChange={(e) => handleSalaryChange(payment.employeeId, e.target.value)}
                          onFocus={() => handleInputFocus(payment.employeeId)}
                          onBlur={() => handleInputBlur(payment.employeeId)}
                        />
                        {savingSalaries[payment.employeeId] && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                      </div>
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
      </ProtectedPageContent>
    </DashboardLayout>
  );
};

export default Pagamentos;
