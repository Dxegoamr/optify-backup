import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Upload, TrendingUp, TrendingDown, ChevronRight, Users, TestTube, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions } from '@/hooks/useFirestore';
import { toast } from 'sonner';
import { generateTestEmployees } from '@/utils/generateTestData';
import EmployeeFormModal from '@/components/dashboard/EmployeeFormModal';

const GestaoFuncionarios = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    try {
      await generateTestEmployees();
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Dados de teste gerados com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar dados de teste');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Buscar funcionários usando Firebase
  const { data: employees = [], isLoading } = useEmployees(user?.uid || '');
  
  // Buscar transações do dia atual
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTransactions = [] } = useTransactions(user?.uid || '', today, today);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cpf.includes(searchTerm) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcular totais do dia
  const totalDeposits = todayTransactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const totalWithdraws = todayTransactions
    .filter(t => t.type === 'withdraw')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
    
  const dailyBalance = totalWithdraws - totalDeposits;

  const getDayProfitLoss = (employee: any) => {
    const employeeTodayTransactions = todayTransactions.filter(
      (t: any) => t.employeeId === employee.id
    );

    const deposits = employeeTodayTransactions
      .filter((t: any) => t.type === 'deposit')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const withdraws = employeeTodayTransactions
      .filter((t: any) => t.type === 'withdraw')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return withdraws - deposits; // Saque positivo, depósito negativo
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestão de Funcionários</h1>
            <p className="text-muted-foreground">Gerencie sua equipe e transações</p>
          </div>
          <div className="flex gap-2">
            {employees.length === 0 && (
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleGenerateTestData}
                disabled={isGenerating}
              >
                <TestTube className="h-4 w-4" />
                {isGenerating ? 'Gerando...' : 'Dados de Teste'}
              </Button>
            )}
            <EmployeeFormModal />
          </div>
        </div>

        {/* Search & Actions */}
        <Card className="p-4 shadow-card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar CSV/Excel
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-card card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Funcionários</p>
                <p className="text-3xl font-bold">{employees.length}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white mb-2">Total de Depósitos do Dia</p>
                <p className="text-3xl font-bold text-success">R$ {totalDeposits.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <ArrowUpCircle className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total de Saques do Dia</p>
                <p className="text-3xl font-bold text-foreground">R$ {totalWithdraws.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <ArrowDownCircle className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card card-hover">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Lucro do Dia</p>
                <p className={`text-3xl font-bold ${dailyBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {dailyBalance >= 0 ? '+' : ''}R$ {dailyBalance.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                {dailyBalance >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Employee Cards Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card className="p-12 text-center shadow-card">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Nenhum funcionário encontrado</p>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Tente buscar com outros termos' : 'Comece cadastrando seu primeiro funcionário'}
            </p>
            {!searchTerm && (
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Cadastrar Funcionário
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => {
              const profitLoss = getDayProfitLoss(employee);
              const isProfitable = profitLoss >= 0;

              return (
                <Card
                  key={employee.id}
                  className="p-6 shadow-card card-hover cursor-pointer group"
                  onClick={() => navigate(`/gestao-funcionarios/${employee.id}`)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                          {employee.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{employee.cpf}</p>
                      </div>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>


                    {/* Day P/L - Destaque Visual */}
                    <div className="pt-4">
                      <div className={`p-4 rounded-xl border-2 ${
                        isProfitable 
                          ? 'bg-success/10 border-success/20' 
                          : 'bg-destructive/10 border-destructive/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Lucro do Dia</p>
                            <div className="flex items-center gap-2">
                              {isProfitable ? (
                                <>
                                  <TrendingUp className="h-5 w-5 text-success" />
                                  <span className="text-2xl font-bold text-success">
                                    +R$ {Math.abs(profitLoss).toLocaleString('pt-BR')}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-5 w-5 text-destructive" />
                                  <span className="text-2xl font-bold text-destructive">
                                    -R$ {Math.abs(profitLoss).toLocaleString('pt-BR')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-end pt-2">
                      <Button variant="ghost" size="sm" className="gap-2 group-hover:gap-3 transition-all">
                        Ver Detalhes
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default GestaoFuncionarios;
