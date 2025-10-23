import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProtectedPageContent } from '@/components/ProtectedPageContent';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { 
  useEmployees, 
  usePlatforms, 
  useTransactions, 
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
  useInitializeDefaultPlatforms,
  useCreateTransaction
} from '@/hooks/useFirestore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const Saldos = () => {
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();
  const [newPlatform, setNewPlatform] = useState({ name: '', color: '#FF5C00' });
  const [editPlatform, setEditPlatform] = useState<any>(null);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
  const [editingBalance, setEditingBalance] = useState<{[key: string]: {employeeId: string, platformId: string, value: string}}>({});

  // Buscar dados usando Firebase
  const { data: employees = [] } = useEmployees(user?.uid || '');
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const { data: allTransactions = [] } = useTransactions(user?.uid || '', '', '');
  
  // Debug: verificar se os dados estão sendo carregados
  console.log('Saldos - Employees:', employees.length);
  console.log('Saldos - Platforms:', platforms.length);
  console.log('Saldos - Transactions:', allTransactions.length);
  console.log('Saldos - All Transactions:', allTransactions);
  console.log('Saldos - Platforms IDs:', platforms.map((p: any) => ({ id: p.id, name: p.name })));
  
  // Debug: verificar se as transações têm platformId
  allTransactions.forEach((t: any, index: number) => {
    console.log(`Transaction ${index}:`, {
      id: t.id,
      employeeId: t.employeeId,
      platformId: t.platformId,
      type: t.type,
      amount: t.amount,
      date: t.date
    });
  });

  // Hooks para mutações
  const createPlatformMutation = useCreatePlatform();
  const updatePlatformMutation = useUpdatePlatform();
  const deletePlatformMutation = useDeletePlatform();
  const initializeDefaultPlatformsMutation = useInitializeDefaultPlatforms();
  const createTransactionMutation = useCreateTransaction();

  // Calcular saldos das plataformas baseado nas transações
  const calculatePlatformBalances = () => {
    const balances: any = {};
    
    employees.forEach((emp: any) => {
      balances[emp.id] = { 
        name: emp.name, 
        platforms: {}, 
        total: 0 
      };
      
      platforms.forEach((plat: any) => {
        const empTransactions = allTransactions.filter(
          (t: any) => t.employeeId === emp.id && t.platformId === plat.id
        );
        
        console.log(`Debug - Employee: ${emp.name}, Platform: ${plat.name}, Transactions:`, empTransactions);
        
        const deposits = empTransactions
          .filter((t: any) => t.type === 'deposit')
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        
        const withdraws = empTransactions
          .filter((t: any) => t.type === 'withdraw')
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        
        console.log(`Debug - Deposits: ${deposits}, Withdraws: ${withdraws}`);
        
        const balance = deposits - withdraws; // Saldo real (pode ser negativo)
        balances[emp.id].platforms[plat.id] = Math.max(0, balance); // Exibir apenas valores positivos
        balances[emp.id].total += Math.max(0, balance);
      });
    });

    return Object.values(balances);
  };

  const platformBalances = calculatePlatformBalances();
  
  // Debug: verificar saldos calculados
  console.log('Saldos - Platform Balances:', platformBalances);

  // Ordenar funcionários alfabeticamente
  const sortedEmployees = [...employees].sort((a: any, b: any) => a.name.localeCompare(b.name));

  // Remover duplicatas e ordenar plataformas por saldo total (maior para menor)
  // Exibir somente as casas selecionadas pelo usuário (isActive === true)
  const activePlatforms = platforms.filter((p: any) => p.isActive !== false);
  const uniquePlatforms = activePlatforms.reduce((acc: any[], platform: any) => {
    const exists = acc.find(p => p.id === platform.id || p.name === platform.name);
    if (!exists) {
      acc.push(platform);
    }
    return acc;
  }, []);
  
  const sortedPlatforms = [...uniquePlatforms].sort((a: any, b: any) => {
    const aTotal = platformBalances.reduce((sum: number, emp: any) => 
      sum + (Number(emp.platforms?.[a.id]) || 0), 0);
    const bTotal = platformBalances.reduce((sum: number, emp: any) => 
      sum + (Number(emp.platforms?.[b.id]) || 0), 0);
    return Number(bTotal) - Number(aTotal); // Maior para menor
  });

  // Calcular saldo total geral
  const totalBalance = platformBalances.reduce((sum: number, emp: any) => sum + (emp.total || 0), 0);

  // Filtrar plataformas para pesquisa
  const filteredPlatforms = platforms.filter((platform: any) =>
    platform.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para iniciar edição de saldo
  const startEditingBalance = (employeeId: string, platformId: string, currentValue: number) => {
    const key = `${employeeId}-${platformId}`;
    setEditingBalance({
      ...editingBalance,
      [key]: {
        employeeId,
        platformId,
        value: currentValue.toString()
      }
    });
  };

  // Função para salvar saldo editado
  const saveBalance = async (employeeId: string, platformId: string) => {
    const key = `${employeeId}-${platformId}`;
    const editData = editingBalance[key];
    if (!editData) return;

    try {
      // Criar uma transação de ajuste manual
      const adjustmentAmount = Number(editData.value);
      const employee = employees.find((e: any) => e.id === employeeId);
      const empBalance = platformBalances.find((b: any) => b.name === (employee as any)?.name);
      const currentBalance = (empBalance as any)?.platforms?.[platformId] || 0;
      
      // Calcular a diferença para criar uma transação de ajuste
      const difference = adjustmentAmount - currentBalance;
      
      if (difference !== 0) {
        const transactionData = {
          userId: user?.uid || '',
          employeeId: employeeId,
          platformId: platformId,
          type: (difference > 0 ? 'deposit' : 'withdraw') as 'deposit' | 'withdraw',
          amount: Math.abs(difference),
          date: new Date().toISOString().split('T')[0],
          description: 'Ajuste manual de saldo'
        };

        // Usar o hook de criar transação
        await createTransactionMutation.mutateAsync(transactionData);
      }

      // Remover do estado de edição
      const newEditingBalance = { ...editingBalance };
      delete newEditingBalance[key];
      setEditingBalance(newEditingBalance);
      toast.success('Saldo atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
      toast.error('Erro ao atualizar saldo');
    }
  };

  // Função para cancelar edição
  const cancelEditing = (employeeId: string, platformId: string) => {
    const key = `${employeeId}-${platformId}`;
    const newEditingBalance = { ...editingBalance };
    delete newEditingBalance[key];
    setEditingBalance(newEditingBalance);
  };

  const handleCreatePlatform = async () => {
    if (!user?.uid) return;
    
    try {
      await createPlatformMutation.mutateAsync({
        userId: user.uid,
        name: newPlatform.name,
        color: newPlatform.color
      });
      toast.success('Casa de aposta criada!');
      setNewPlatform({ name: '', color: '#FF5C00' });
      setPlatformDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar casa de aposta');
    }
  };

  const handleUpdatePlatform = async () => {
    if (!editPlatform) return;
    
    try {
      await updatePlatformMutation.mutateAsync({
        userId: user?.uid || '',
        id: editPlatform.id,
        data: {
          name: editPlatform.name,
          color: editPlatform.color
        }
      });
      toast.success('Casa de aposta atualizada!');
      setEditPlatform(null);
    } catch (error) {
      toast.error('Erro ao atualizar casa de aposta');
    }
  };

  const handleDeletePlatform = async (id: string) => {
    try {
      await deletePlatformMutation.mutateAsync({ userId: user?.uid || '', id });
      toast.success('Casa de aposta excluída!');
    } catch (error) {
      toast.error('Erro ao excluir casa de aposta');
    }
  };

  // Função para inicializar plataformas padrão manualmente
  const handleInitializeDefaultPlatforms = async () => {
    if (!user?.uid) return;
    
    try {
      await initializeDefaultPlatformsMutation.mutateAsync(user.uid);
      toast.success('Plataformas padrão criadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar plataformas padrão');
    }
  };

  // Função para atualizar cores das plataformas existentes
  const handleUpdatePlatformColors = async () => {
    if (!user?.uid) return;
    
    try {
      const colorUpdates = [
        { name: 'Pixbet', color: '#ADD8E6' },
        { name: 'Betano', color: '#FF6600' },
        { name: 'Mcgames', color: '#DC143C' },
        { name: 'Kto', color: '#C80000' },
        { name: 'Realsbet', color: '#00FFC8' },
        { name: 'Vaidebet', color: '#FFD700' },
        { name: 'Sportingbet', color: '#4682B4' },
        { name: 'Superbet', color: '#FF3366' },
        { name: 'Betao', color: '#FFA550' },
        { name: 'Bet365', color: '#008040' },
        { name: 'Esportivabet', color: '#FF8C00' },
        { name: 'Hiperbet', color: '#DC0000' },
        { name: 'Luvabet', color: '#ADFF2F' },
        { name: 'Cassinopix', color: '#87CEEB' },
        { name: 'Multibet', color: '#483D8B' }
      ];

      const updatePromises = platforms.map((platform: any) => {
        const colorUpdate = colorUpdates.find(c => c.name === platform.name);
        if (colorUpdate && platform.color !== colorUpdate.color) {
          return updatePlatformMutation.mutateAsync({
            userId: user.uid,
            id: platform.id,
            data: { color: colorUpdate.color }
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      toast.success('Cores das plataformas atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar cores das plataformas');
    }
  };

  return (
    <DashboardLayout>
      <ProtectedPageContent 
        requiredFeature="balances" 
        featureName="Saldos"
        requiredPlan="Medium"
      >
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Saldos</h1>
              <p className="text-muted-foreground">Gerencie contas e saldos por plataforma</p>
            </div>
          <div className="flex gap-2">
            {activePlatforms.length === 0 && (
              <Button 
                onClick={handleInitializeDefaultPlatforms}
                disabled={initializeDefaultPlatformsMutation.isPending}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {initializeDefaultPlatformsMutation.isPending ? 'Criando...' : 'Criar Plataformas Padrão'}
              </Button>
            )}
            {activePlatforms.length > 0 && (
              <Button 
                onClick={handleUpdatePlatformColors}
                disabled={updatePlatformMutation.isPending}
                variant="outline"
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                {updatePlatformMutation.isPending ? 'Atualizando...' : 'Atualizar Cores'}
              </Button>
            )}
            {activePlatforms.length > 0 && (
              <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Search className="h-4 w-4" />
                    Pesquisar Plataforma
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pesquisar Plataforma</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                      <Label>Nome da Plataforma</Label>
                      <Input 
                        placeholder="Digite o nome da plataforma..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredPlatforms.map((platform: any) => (
                        <Button
                          key={platform.id}
                          variant="outline"
                          className="w-full justify-start mb-2"
                          onClick={() => {
                            setSelectedPlatform(platform);
                            setSearchDialogOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          <div 
                            className="w-4 h-4 rounded mr-2" 
                            style={{ backgroundColor: platform.color }}
                          />
                          {platform.name}
                        </Button>
                      ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
            <Dialog open={platformDialogOpen} onOpenChange={setPlatformDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Casa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Casa de Aposta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Nome</Label>
                    <Input 
                      value={newPlatform.name} 
                      onChange={(e) => setNewPlatform({...newPlatform, name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Cor</Label>
                    <Input 
                      type="color" 
                      value={newPlatform.color} 
                      onChange={(e) => setNewPlatform({...newPlatform, color: e.target.value})} 
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleCreatePlatform}
                    disabled={!newPlatform.name.trim()}
                  >
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Total Balance */}
        <Card className="p-6 shadow-card gradient-success">
          <p className="text-sm text-success-foreground/80 mb-2">Saldo Total</p>
          <p className="text-4xl font-bold text-success-foreground">
            R$ {Number(totalBalance || 0).toLocaleString('pt-BR')}
          </p>
        </Card>

        {/* Platform Balances Table */}
        <Card className="shadow-card overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Saldos por Plataforma</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Clique nos valores para editar. Os valores são salvos automaticamente ao sair do campo.
            </p>
            {selectedPlatform && (
              <div className="mt-2 p-2 bg-muted rounded">
                <span className="text-sm">Filtrado por: </span>
                <span 
                  className="inline-block w-3 h-3 rounded mr-1" 
                  style={{ backgroundColor: selectedPlatform.color }}
                />
                <span className="font-medium">{selectedPlatform.name}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedPlatform(null)}
                  className="ml-2 h-6 px-2"
                >
                  Limpar filtro
                </Button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold sticky left-0 bg-background z-10">
                    Funcionário
                  </th>
                  <th className="text-center p-4 font-semibold sticky left-20 bg-background z-10">
                    Total por Funcionário
                  </th>
                  {sortedPlatforms.map((plat: any) => (
                    <th key={plat.id} className="text-center p-4 font-semibold min-w-[120px]" style={{ backgroundColor: plat.color + '20' }}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-white font-medium">{plat.name}</span>
                        <Dialog open={editPlatform?.id === plat.id} onOpenChange={(open) => !open && setEditPlatform(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-white hover:bg-white/20" 
                              onClick={() => setEditPlatform(plat)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Casa de Aposta</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label>Nome</Label>
                                <Input 
                                  value={editPlatform?.name || ''} 
                                  onChange={(e) => setEditPlatform({...editPlatform, name: e.target.value})} 
                                />
                              </div>
                              <div>
                                <Label>Cor</Label>
                                <Input 
                                  type="color" 
                                  value={editPlatform?.color || '#FF5C00'} 
                                  onChange={(e) => setEditPlatform({...editPlatform, color: e.target.value})} 
                                />
                              </div>
                              <Button 
                                className="w-full" 
                                onClick={handleUpdatePlatform}
                                disabled={!editPlatform?.name?.trim()}
                              >
                                Salvar
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-white hover:bg-white/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir casa de aposta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todas as transações relacionadas a esta plataforma serão mantidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePlatform(plat.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp: any) => {
                  const empBalance = platformBalances.find((b: any) => b.name === emp.name);
                  return (
                    <tr key={emp.id} className="border-t hover:bg-muted/30">
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">
                        {emp.name}
                      </td>
                      <td className="p-4 text-center font-bold sticky left-20 bg-background z-10">
                        <span className="text-success">
                          R$ {((empBalance as any)?.total || 0).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      {sortedPlatforms.map((plat: any) => {
                        const key = `${emp.id}-${plat.id}`;
                        const isEditing = editingBalance[key];
                        const currentValue = (empBalance as any)?.platforms?.[plat.id] || 0;
                        
                        return (
                          <td key={plat.id} className="p-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={isEditing.value}
                                  onChange={(e) => setEditingBalance({
                                    ...editingBalance,
                                    [key]: { ...isEditing, value: e.target.value }
                                  })}
                                  className="w-20 h-8 text-center"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveBalance(emp.id, plat.id);
                                    } else if (e.key === 'Escape') {
                                      cancelEditing(emp.id, plat.id);
                                    }
                                  }}
                                  onBlur={() => saveBalance(emp.id, plat.id)}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <span 
                                className="text-success cursor-pointer hover:bg-muted/50 p-1 rounded"
                                onClick={() => startEditingBalance(emp.id, plat.id, currentValue)}
                              >
                                R$ {currentValue.toLocaleString('pt-BR')}
                      </span>
                            )}
                    </td>
                        );
                      })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
      </ProtectedPageContent>
    </DashboardLayout>
  );
};

export default Saldos;