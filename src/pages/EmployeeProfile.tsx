import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Copy, Edit, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useUpdateEmployee, useDeleteEmployee, useCreateTransaction, useDeleteTransaction, useUpdateTransaction, useTransactions, usePlatforms } from '@/hooks/useFirestore';
import { toast } from 'sonner';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();

  const [depositAmount, setDepositAmount] = useState('');
  const [depositPlatform, setDepositPlatform] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPlatform, setWithdrawPlatform] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTransactionModalOpen, setEditTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editTransactionData, setEditTransactionData] = useState({
    amount: '',
    platformId: '',
    type: 'deposit' as 'deposit' | 'withdraw'
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    birthDate: '',
    salary: 0,
    payDay: 1,
    status: 'active' as 'active' | 'inactive'
  });

  // Buscar funcionário usando Firebase
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const employee = employees.find(emp => emp.id === id);
  
  // Buscar transações do funcionário
  const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
  const { data: employeeTransactions = [] } = useTransactions(user?.uid || '', today, today);
  
  // Filtrar transações do funcionário e excluir ajustes manuais de saldo
  const employeeTodayTransactions = employeeTransactions
    .filter(t => 
      t.employeeId === id && (!t.description || !t.description.includes('Ajuste manual de saldo'))
    )
    .sort((a, b) => {
      // Ordenar por createdAt em ordem decrescente (mais recentes primeiro)
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || a.date);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || b.date);
      return dateB.getTime() - dateA.getTime();
    });

  // Mutations
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const updateTransaction = useUpdateTransaction();

  // Função para abrir modal de edição
  const handleEditClick = () => {
    if (employee) {
      setEditFormData({
        name: employee.name,
        cpf: employee.cpf || '',
        email: employee.email || '',
        phone: employee.phone || '',
        birthDate: employee.birthDate || '',
        salary: employee.salary || 0,
        payDay: employee.payDay || 1,
        status: employee.status || 'active'
      });
      setEditModalOpen(true);
    }
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!employee || !user?.uid) return;

    // Validar se o nome foi preenchido
    if (!editFormData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    try {
      const updateData: any = {
        name: editFormData.name.trim(),
        updatedAt: new Date()
      };

      // Adicionar campos apenas se foram preenchidos
      if (editFormData.cpf.trim()) updateData.cpf = editFormData.cpf.trim();
      if (editFormData.email.trim()) updateData.email = editFormData.email.trim();
      if (editFormData.phone.trim()) updateData.phone = editFormData.phone.trim();
      if (editFormData.birthDate) updateData.birthDate = editFormData.birthDate;
      if (editFormData.salary > 0) updateData.salary = editFormData.salary;
      if (editFormData.payDay > 0) updateData.payDay = editFormData.payDay;
      
      // Usar o status selecionado no formulário
      updateData.status = editFormData.status;

      await updateEmployee.mutateAsync({
        userId: user.uid,
        id: employee.id,
        data: updateData
      });
      
      toast.success('Funcionário atualizado com sucesso!');
      setEditModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      toast.error('Erro ao atualizar funcionário. Tente novamente.');
    }
  };

  // Função para excluir funcionário
  const handleDeleteEmployee = async () => {
    if (!employee || !user?.uid) return;

    try {
      await deleteEmployee.mutateAsync({
        userId: user.uid,
        id: employee.id
      });
      toast.success('Funcionário excluído com sucesso!');
      navigate('/gestao-funcionarios');
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      toast.error('Erro ao excluir funcionário. Tente novamente.');
    }
  };

  // Função para abrir modal de edição de transação
  const handleEditTransactionClick = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditTransactionData({
      amount: transaction.amount.toString(),
      platformId: transaction.platformId || '',
      type: transaction.type
    });
    setEditTransactionModalOpen(true);
  };

  // Função para salvar edição de transação
  const handleSaveTransactionEdit = async () => {
    if (!editingTransaction || !user?.uid) return;

    try {
      await updateTransaction.mutateAsync({
        userId: user.uid,
        id: editingTransaction.id,
        data: {
          amount: Number(editTransactionData.amount),
          platformId: editTransactionData.platformId,
          type: editTransactionData.type
        }
      });
      toast.success('Transação atualizada com sucesso!');
      setEditTransactionModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      toast.error('Erro ao atualizar transação. Tente novamente.');
    }
  };

  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  
  // Debug: verificar se as plataformas estão sendo carregadas
  console.log('Platforms loaded:', platforms);
  console.log('Deposit platform:', depositPlatform);
  console.log('Withdraw platform:', withdrawPlatform);

  // Usar transações já carregadas do Firebase
  const transactions = employeeTodayTransactions;

  // Função para criar transação usando Firebase
  const handleCreateTransaction = async (type: 'deposit' | 'withdraw', amount: string, platformId: string) => {
    if (!employee || !user?.uid) return;

    try {
      const transactionData = {
        userId: user.uid,
        employeeId: employee.id,
        platformId: platformId, // Sempre incluir platformId
        type,
        amount: Number(amount),
        date: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')
      };

      console.log('Creating transaction:', transactionData);
      console.log('Transaction date being saved:', transactionData.date);
      const result = await createTransaction.mutateAsync(transactionData);
      console.log('Transaction created with ID:', result);
      
      toast.success(`${type === 'deposit' ? 'Depósito' : 'Saque'} registrado com sucesso!`);
      
      // Limpar campos
      if (type === 'deposit') {
        setDepositAmount('');
        setDepositPlatform('');
      } else {
        setWithdrawAmount('');
        setWithdrawPlatform('');
      }
    } catch (error) {
      console.error('Erro ao registrar transação:', error);
      toast.error('Erro ao registrar transação. Tente novamente.');
    }
  };


  const handleDeposit = () => {
    if (!depositAmount) {
      toast.error('Preencha o valor do depósito');
      return;
    }
    
    // Temporariamente tornar plataforma opcional para debug
    console.log('Attempting deposit with platform:', depositPlatform);
    
    if (!depositPlatform) {
      console.log('No platform selected, proceeding without platform');
      handleCreateTransaction('deposit', depositAmount, '');
      return;
    }

    handleCreateTransaction('deposit', depositAmount, depositPlatform);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount) {
      toast.error('Preencha o valor do saque');
      return;
    }
    
    // Temporariamente tornar plataforma opcional para debug
    console.log('Attempting withdraw with platform:', withdrawPlatform);
    
    if (!withdrawPlatform) {
      console.log('No platform selected, proceeding without platform');
      handleCreateTransaction('withdraw', withdrawAmount, '');
      return;
    }

    handleCreateTransaction('withdraw', withdrawAmount, withdrawPlatform);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestao-funcionarios')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{employee.name}</h1>
            <p className="text-muted-foreground">Perfil do Funcionário</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleEditClick}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o funcionário {employee.name}? 
                  Esta ação não pode ser desfeita e todas as transações relacionadas serão perdidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteEmployee}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteEmployee.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Employee Info */}
        <Card className="p-6 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">CPF</Label>
                <p className="text-lg font-semibold">{employee.cpf}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(employee.cpf, 'CPF')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {employee.email && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="text-lg font-semibold">{employee.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(employee.email!, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            {employee.phone && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Telefone</Label>
                  <p className="text-lg font-semibold">{employee.phone}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(employee.phone!, 'Telefone')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            {employee.birthDate && (
              <div>
                <Label className="text-sm text-muted-foreground">Data de Nascimento</Label>
                <p className="text-lg font-semibold">
                  {new Date(employee.birthDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}


            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div className="mt-2">
                <Badge 
                  variant={employee.status === 'active' ? 'default' : 'secondary'}
                  className={employee.status === 'active' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                >
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${employee.status === 'active' ? 'bg-white' : 'bg-white'}`}></div>
                    {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                  </div>
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Transaction Forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deposit */}
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4">Registrar Depósito</h3>
            <div className="space-y-4">
              <div>
                <Label>Valor (BRL)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Plataforma</Label>
                <Select value={depositPlatform} onValueChange={setDepositPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleDeposit}
                disabled={createTransaction.isPending}
                className="w-full bg-destructive hover:bg-destructive/90"
              >
                Registrar Depósito
              </Button>
            </div>
          </Card>

          {/* Withdraw */}
          <Card className="p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4">Registrar Saque</h3>
            <div className="space-y-4">
              <div>
                <Label>Valor (BRL)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Plataforma</Label>
                <Select value={withdrawPlatform} onValueChange={setWithdrawPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={createTransaction.isPending}
                className="w-full"
                style={{ backgroundColor: '#9333EA' }}
              >
                Registrar Saque
              </Button>
            </div>
          </Card>
        </div>

        {/* Transactions History */}
        <Card className="shadow-card">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-lg font-semibold">Histórico de Movimentações (Hoje)</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação hoje
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge 
                          className={transaction.type === 'deposit' 
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' 
                            : 'bg-success text-success-foreground hover:bg-success/80'}
                        >
                          {transaction.type === 'deposit' ? (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Depósito
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Saque
                            </div>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-semibold"
                          style={{ color: (() => {
                            const platform = platforms.find(p => p.id === transaction.platformId);
                            return platform?.color || '#FF5C00';
                          })() }}
                        >
                          {(() => {
                            const platform = platforms.find(p => p.id === transaction.platformId);
                            return platform?.name || 'N/A';
                          })()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const transactionDate = transaction.createdAt?.toDate?.() || new Date(transaction.createdAt || transaction.date);
                          const dateStr = transactionDate.toLocaleDateString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                          const timeStr = transactionDate.toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          return `${dateStr} ${timeStr}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className={transaction.type === 'deposit' ? 'text-destructive' : 'text-success'}>
                          {transaction.type === 'deposit' ? '-' : '+'}R${' '}
                          {Number(transaction.amount).toLocaleString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditTransactionClick(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteTransaction.mutate(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal de Edição */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Funcionário</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Preencha as informações do funcionário. Apenas o nome é obrigatório.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input
                  id="edit-cpf"
                  value={editFormData.cpf}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, cpf: e.target.value }))}
                  placeholder="000.000.000-00 (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000 (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={editFormData.birthDate}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salário (R$)</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  placeholder="0,00"
                  value={editFormData.salary}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, salary: Number(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-payDay">Dia do Pagamento</Label>
                <Select value={editFormData.payDay.toString()} onValueChange={(value) => setEditFormData(prev => ({ ...prev, payDay: Number(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}º dia do mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status do Funcionário</Label>
                <Select value={editFormData.status} onValueChange={(value: 'active' | 'inactive') => setEditFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Ativo
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Inativo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateEmployee.isPending}>
                  {updateEmployee.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Transação */}
        <Dialog open={editTransactionModalOpen} onOpenChange={setEditTransactionModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Transação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-amount">Valor</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editTransactionData.amount}
                  onChange={(e) => setEditTransactionData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Digite o valor"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-type">Tipo</Label>
                <Select 
                  value={editTransactionData.type} 
                  onValueChange={(value: 'deposit' | 'withdraw') => setEditTransactionData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Depósito</SelectItem>
                    <SelectItem value="withdraw">Saque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-platform">Plataforma</Label>
                <Select 
                  value={editTransactionData.platformId} 
                  onValueChange={(value) => setEditTransactionData(prev => ({ ...prev, platformId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform: any) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setEditTransactionModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveTransactionEdit}
                  disabled={updateTransaction.isPending}
                >
                  {updateTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeProfile;
