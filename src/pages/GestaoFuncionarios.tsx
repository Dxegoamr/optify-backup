import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Upload, TrendingUp, TrendingDown, ChevronRight, Users, TestTube, ArrowUpCircle, ArrowDownCircle, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useTransactions, useCreateEmployee } from '@/hooks/useFirestore';
import { toast } from 'sonner';
import { generateTestEmployees } from '@/utils/generateTestData';
import EmployeeFormModal from '@/components/dashboard/EmployeeFormModal';

const GestaoFuncionarios = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<{success: number, errors: number, details: string[]}>({success: 0, errors: 0, details: []});
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const createEmployee = useCreateEmployee();

  // Função para processar arquivo CSV
  const processCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const employee: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch(header) {
            case 'nome':
            case 'name':
              employee.name = value;
              break;
            case 'cpf':
              employee.cpf = value;
              break;
            case 'email':
            case 'e-mail':
              employee.email = value;
              break;
            case 'telefone':
            case 'phone':
              employee.phone = value;
              break;
            case 'data_nascimento':
            case 'birth_date':
            case 'nascimento':
              employee.birthDate = value;
              break;
            case 'salario':
            case 'salary':
              employee.salary = parseFloat(value) || 0;
              break;
            case 'dia_pagamento':
            case 'pay_day':
            case 'pagamento':
              employee.payDay = parseInt(value) || 1;
              break;
            case 'status':
              employee.status = value.toLowerCase() === 'ativo' || value.toLowerCase() === 'active' ? 'active' : 'inactive';
              break;
          }
        });
        
        return employee;
      }).filter(emp => emp.name); // Filtrar apenas funcionários com nome
      
      setImportData(data);
      setImportStatus('idle');
    };
    reader.readAsText(file);
  };

  // Função para processar arquivo Excel (simplificada)
  const processExcelFile = (file: File) => {
    // Para Excel, vamos usar uma abordagem simplificada
    // Em produção, seria necessário usar uma biblioteca como xlsx
    toast.error('Importação de Excel ainda não implementada. Use arquivo CSV.');
  };

  // Função para lidar com upload de arquivo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'csv') {
      processCSVFile(file);
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      processExcelFile(file);
    } else {
      toast.error('Formato de arquivo não suportado. Use CSV ou Excel.');
      return;
    }
  };

  // Função para importar funcionários
  const handleImportEmployees = async () => {
    if (!user?.uid || importData.length === 0) return;

    setImportStatus('processing');
    const results = { success: 0, errors: 0, details: [] as string[] };

    for (const employeeData of importData) {
      try {
        await createEmployee.mutateAsync({
          userId: user.uid,
          name: employeeData.name,
          cpf: employeeData.cpf || '',
          email: employeeData.email || '',
          phone: employeeData.phone || '',
          birthDate: employeeData.birthDate || '',
          salary: employeeData.salary || 0,
          payDay: employeeData.payDay || 1,
          status: employeeData.status || 'active'
        });
        
        results.success++;
        results.details.push(`✅ ${employeeData.name} - Criado com sucesso`);
      } catch (error) {
        results.errors++;
        results.details.push(`❌ ${employeeData.name} - Erro: ${error}`);
      }
    }

    setImportResults(results);
    setImportStatus(results.errors === 0 ? 'success' : 'error');
    
    if (results.success > 0) {
      toast.success(`${results.success} funcionário(s) importado(s) com sucesso!`);
    }
    if (results.errors > 0) {
      toast.error(`${results.errors} funcionário(s) falharam na importação.`);
    }
  };

  // Função para resetar importação
  const resetImport = () => {
    setImportData([]);
    setImportStatus('idle');
    setImportResults({success: 0, errors: 0, details: []});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Buscar transações do dia atual
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTransactions = [] } = useTransactions(user?.uid || '', today, today);

  const filteredEmployees = employees.filter(emp =>
    (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.cpf || '').includes(searchTerm) ||
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
              <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <Upload className="h-4 w-4" />
                    Importar CSV/Excel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Importar Funcionários
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Selecione um arquivo CSV ou Excel
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Escolher Arquivo
                      </Button>
                    </div>

                    {/* Format Info */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Formato esperado do CSV:</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Colunas suportadas:</strong> nome, cpf, email, telefone, data_nascimento, salario, dia_pagamento, status</p>
                        <p><strong>Obrigatório:</strong> nome</p>
                        <p><strong>Opcional:</strong> todos os outros campos</p>
                        <p><strong>Status:</strong> "ativo" ou "inativo" (padrão: ativo)</p>
                      </div>
                    </div>

                    {/* Preview Data */}
                    {importData.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">
                            Preview ({importData.length} funcionário(s) encontrado(s))
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetImport}
                          >
                            Limpar
                          </Button>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">Nome</th>
                                <th className="p-2 text-left">CPF</th>
                                <th className="p-2 text-left">Email</th>
                                <th className="p-2 text-left">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importData.slice(0, 10).map((emp, index) => (
                                <tr key={index} className="border-t">
                                  <td className="p-2">{emp.name}</td>
                                  <td className="p-2">{emp.cpf || '-'}</td>
                                  <td className="p-2">{emp.email || '-'}</td>
                                  <td className="p-2">
                                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                                      {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {importData.length > 10 && (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              ... e mais {importData.length - 10} funcionário(s)
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={handleImportEmployees}
                          disabled={importStatus === 'processing'}
                          className="w-full gap-2"
                        >
                          {importStatus === 'processing' ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Importando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Importar {importData.length} Funcionário(s)
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Results */}
                    {importStatus !== 'idle' && importResults.details.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          {importStatus === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : importStatus === 'error' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                          <h4 className="font-semibold">
                            Resultado da Importação
                          </h4>
                        </div>
                        
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex gap-4 mb-3">
                            <div className="text-green-600">
                              <strong>{importResults.success}</strong> sucesso(s)
                            </div>
                            <div className="text-red-600">
                              <strong>{importResults.errors}</strong> erro(s)
                            </div>
                          </div>
                          
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {importResults.details.map((detail, index) => (
                              <div key={index} className="text-sm">
                                {detail}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={resetImport}
                            className="flex-1"
                          >
                            Nova Importação
                          </Button>
                          <Button
                            onClick={() => setImportModalOpen(false)}
                            className="flex-1"
                          >
                            Fechar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 shadow-card card-hover hover:shadow-glow transition-all duration-300">
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

          <Card 
            className="p-6 shadow-card card-hover cursor-pointer hover:shadow-glow transition-all duration-300"
            onClick={() => navigate('/relatorios')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white mb-2">Total de Depósitos do Dia</p>
                <p className="text-3xl font-bold text-foreground">R$ {totalDeposits.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
                <ArrowUpCircle className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 shadow-card card-hover cursor-pointer hover:shadow-glow transition-all duration-300"
            onClick={() => navigate('/relatorios')}
          >
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

          <Card 
            className="p-6 shadow-card card-hover cursor-pointer hover:shadow-glow transition-all duration-300"
            onClick={() => navigate('/relatorios')}
          >
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
              <EmployeeFormModal />
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
                  className={`p-6 shadow-card card-hover cursor-pointer group transition-all duration-300 ${
                    employee.status === 'inactive' 
                      ? 'opacity-60 grayscale-[0.3] border-dashed border-2 border-muted-foreground/30' 
                      : ''
                  }`}
                  onClick={() => navigate(`/gestao-funcionarios/${employee.id}`)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-1 group-hover:text-primary transition-colors ${
                          employee.status === 'inactive' ? 'text-muted-foreground line-through' : ''
                        }`}>
                          {employee.name}
                        </h3>
                        <p className={`text-sm ${employee.status === 'inactive' ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                          {employee.cpf}
                        </p>
                      </div>
                      <Badge 
                        variant={employee.status === 'active' ? 'default' : 'secondary'}
                        className={employee.status === 'inactive' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            employee.status === 'active' ? 'bg-white' : 'bg-white'
                          }`}></div>
                          {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                        </div>
                      </Badge>
                    </div>


                    {/* Day P/L - Destaque Visual */}
                    <div className="pt-4">
                      <div className={`p-4 rounded-xl border-2 ${
                        employee.status === 'inactive'
                          ? 'bg-muted/20 border-muted/30'
                          : isProfitable 
                            ? 'bg-success/10 border-success/20' 
                            : 'bg-destructive/10 border-destructive/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Lucro do Dia</p>
                            <div className="flex items-center gap-2">
                              {employee.status === 'inactive' ? (
                                <>
                                  <div className="h-5 w-5 rounded-full bg-muted-foreground/50 flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground">-</span>
                                  </div>
                                  <span className="text-2xl font-bold text-muted-foreground">
                                    R$ 0
                                  </span>
                                </>
                              ) : isProfitable ? (
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`gap-2 transition-all ${
                          employee.status === 'inactive' 
                            ? 'text-muted-foreground/70 hover:text-muted-foreground' 
                            : 'group-hover:gap-3'
                        }`}
                      >
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
