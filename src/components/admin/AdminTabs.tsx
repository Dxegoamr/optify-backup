import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, TrendingUp, DollarSign, Activity, Shield, Search, UserPlus, BarChart3, Settings } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useAdminData } from '@/hooks/useAdminData';
import { getAllUsers as getAdminUsers, AdminUser } from '@/core/services/admin-data.service';
import { isAdminEmail } from '@/core/services/admin.service';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  findUserByEmail, 
  updateUserPlan, 
  getPlanChangeHistory, 
  getAllUsers,
  PlanChangeHistory 
} from '@/core/services/admin-plan-management.service';
import { UserProfileService } from '@/core/services/user-profile.service';
import { checkUserIsAdmin, addAdmin } from '@/core/services/admin.service';
import { 
  promoteUserToAdmin,
  demoteUserFromAdmin,
  getAllAdmins,
  getAdminPromotionHistory,
  getAdminDemotionHistory,
  AdminPromotion,
  AdminDemotion
} from '@/core/services/admin-promotion.service';
import { deleteUserCompletely, canDeleteUser } from '@/core/services/user-deletion.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, UserCheck, Edit, Eye, X } from 'lucide-react';
import EmailAutocomplete from '@/components/ui/email-autocomplete';
import { UserSearchResult } from '@/core/services/user-search.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Funções locais para gerenciamento de planos
const getAvailablePlans = () => {
  return [
    { 
      id: 'free', 
      name: 'Free', 
      description: 'Plano gratuito com funcionalidades básicas',
      price: 0,
      features: ['Funcionalidades básicas', 'Suporte por email']
    },
    { 
      id: 'standard', 
      name: 'Standard', 
      description: 'Plano intermediário com mais recursos',
      price: 34.90,
      features: ['Todas as funcionalidades Free', 'Relatórios avançados', 'Suporte prioritário']
    },
    { 
      id: 'medium', 
      name: 'Medium', 
      description: 'Plano avançado para empresas em crescimento',
      price: 49.90,
      features: ['Todas as funcionalidades Standard', 'API access', 'Integrações avançadas']
    },
    { 
      id: 'ultimate', 
      name: 'Ultimate', 
      description: 'Plano premium com todos os recursos',
      price: 74.90,
      features: ['Todas as funcionalidades', 'Suporte 24/7', 'Consultoria personalizada']
    }
  ];
};

const isValidPlan = (plan: string): boolean => {
  const validPlans = ['free', 'standard', 'medium', 'ultimate'];
  return validPlans.includes(plan);
};

const AdminTabs = () => {
  const { user: currentUser, isAdmin } = useFirebaseAuth();
  const { stats, loading: statsLoading, error: statsError, refetch } = useAdminData();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planChangeHistory, setPlanChangeHistory] = useState<PlanChangeHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Estados para gerenciamento de planos
  const [userEmail, setUserEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [subscriptionMonths, setSubscriptionMonths] = useState<number>(0);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [userSearchResult, setUserSearchResult] = useState<any>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  // Estados para gerenciamento de admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminReason, setAdminReason] = useState('');

  const [isPromotingAdmin, setIsPromotingAdmin] = useState(false);
  const [adminSearchResult, setAdminSearchResult] = useState<any>(null);
  const [isSearchingAdmin, setIsSearchingAdmin] = useState(false);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [adminPromotionHistory, setAdminPromotionHistory] = useState<AdminPromotion[]>([]);
  const [adminDemotionHistory, setAdminDemotionHistory] = useState<AdminDemotion[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  // Estados para modais de usuário
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const availablePlans = getAvailablePlans();

  // Função helper para verificar se pode excluir usuário (síncrona)
  const canDeleteUserSync = (targetUserId: string): boolean => {
    if (!currentUser) return false;
    
    const isSuperAdmin = currentUser.email && isAdminEmail(currentUser.email);
    
    if (!isSuperAdmin) return false;
    if (targetUserId === currentUser.uid) return false;
    
    return true;
  };

  // Buscar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const allUsers = await getAdminUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        // Removido toast de erro para melhor UX
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Buscar histórico de alterações
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const history = await getPlanChangeHistory();
        setPlanChangeHistory(history.sort((a, b) => {
          const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date(a.createdAt);
          const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }));
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Buscar administradores e histórico
  useEffect(() => {
    const fetchAdminsData = async () => {
      try {
        setAdminsLoading(true);
        const [admins, promotions, demotions] = await Promise.all([
          getAllAdmins(),
          getAdminPromotionHistory(),
          getAdminDemotionHistory()
        ]);
        
        setAdminsList(admins);
        setAdminPromotionHistory(promotions.sort((a, b) => {
          const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }));
        setAdminDemotionHistory(demotions.sort((a, b) => {
          const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }));
      } catch (error) {
        console.error('Erro ao buscar dados de admin:', error);
      } finally {
        setAdminsLoading(false);
      }
    };

    fetchAdminsData();
  }, []);

  // Filtrar usuários baseado na busca
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    refetch();
    toast.success('Dados atualizados com sucesso!');
  };

  const handleUserSearch = async () => {
    if (!userEmail.trim()) {
      // Removido toast de erro para melhor UX
      return;
    }

    try {
      setIsSearchingUser(true);
      const user = await findUserByEmail(userEmail.trim());
      setUserSearchResult(user);
      if (user) {
        setSelectedPlan(user.currentPlan);
      } else {
        setSelectedPlan('');
      }
    } catch (error) {
      setUserSearchResult(null);
      setSelectedPlan('');
      // Removido toast de erro para melhor UX
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handlePlanUpdate = async () => {
    if (!userSearchResult || !selectedPlan) {
      toast.error('Por favor, selecione um usuário e um plano');
      return;
    }

    if (selectedPlan === userSearchResult.currentPlan) {
      toast.error('O usuário já possui este plano');
      return;
    }

    if (!isValidPlan(selectedPlan)) {
      toast.error('Plano inválido selecionado');
      return;
    }

    try {
      setIsUpdatingPlan(true);
      await updateUserPlan(
        userSearchResult.email,
        selectedPlan,
        currentUser?.email || '',
        changeReason || undefined,
        subscriptionMonths || undefined
      );

      // Limpar formulário
      setUserEmail('');
      setSelectedPlan('');
      setChangeReason('');
      setSubscriptionMonths(0);
      setUserSearchResult(null);

      // Atualizar dados
      refetch();
      const allUsers = await getAdminUsers();
      setUsers(allUsers);

      // Atualizar histórico
      const history = await getPlanChangeHistory();
      setPlanChangeHistory(history.sort((a, b) => {
        const dateA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date(a.createdAt);
        const dateB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));

    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleAdminSearch = async () => {
    if (!adminEmail.trim()) {
      // Removido toast de erro para melhor UX
      return;
    }

    try {
      setIsSearchingAdmin(true);
      const foundUser = await findUserByEmail(adminEmail.trim());
      setAdminSearchResult(foundUser);
    } catch (error) {
      setAdminSearchResult(null);
      // Removido toast de erro para melhor UX
    } finally {
      setIsSearchingAdmin(false);
    }
  };

  const handleAdminPromotion = async () => {
    if (!adminSearchResult) {
      toast.error('Por favor, busque um usuário primeiro');
      return;
    }

    try {
      setIsPromotingAdmin(true);
      await promoteUserToAdmin(
        adminSearchResult.email,
        currentUser?.email || '',
        adminReason || undefined
      );

      // Limpar formulário
      setAdminEmail('');
      setAdminReason('');
      setAdminSearchResult(null);

      // Atualizar dados
      const [admins, promotions, demotions] = await Promise.all([
        getAllAdmins(),
        getAdminPromotionHistory(),
        getAdminDemotionHistory()
      ]);
      
      setAdminsList(admins);
      setAdminPromotionHistory(promotions.sort((a, b) => {
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));
      setAdminDemotionHistory(demotions.sort((a, b) => {
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));

    } catch (error) {
      console.error('Erro ao promover usuário:', error);
    } finally {
      setIsPromotingAdmin(false);
    }
  };

  const handleAdminDemotion = async (targetEmail: string) => {
    try {
      await demoteUserFromAdmin(
        targetEmail,
        currentUser?.email || '',
        'Remoção via painel administrativo'
      );

      // Atualizar dados
      const [admins, demotions] = await Promise.all([
        getAllAdmins(),
        getAdminDemotionHistory()
      ]);
      
      setAdminsList(admins);
      setAdminDemotionHistory(demotions.sort((a, b) => {
        const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));

    } catch (error) {
      console.error('Erro ao remover privilégios de admin:', error);
    }
  };

  // Funções para modais de usuário
  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleViewDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
  };

  const handleCloseModals = () => {
    setSelectedUser(null);
    setEditModalOpen(false);
    setDetailsModalOpen(false);
    setDeleteModalOpen(false);
    setUserToDelete(null);
    setDeleteConfirmation('');
  };

  const handleDeleteUser = (user: AdminUser) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    if (deleteConfirmation.toLowerCase() !== 'excluir') {
      toast.error('Digite "excluir" para confirmar a exclusão');
      return;
    }

    // Verificar se pode excluir o usuário
    const canDeleteResult = await canDeleteUser(userToDelete.id, currentUser);
    if (!canDeleteResult.canDelete) {
      toast.error(canDeleteResult.reason);
      return;
    }

    try {
      setIsDeleting(true);
      
      // Para usuários mock, apenas simular a exclusão
      if (userToDelete.id.startsWith('mock')) {
        console.log(`📝 Exclusão simulada para usuário mock: ${userToDelete.email}`);
        toast.success(`Usuário ${userToDelete.email} excluído com sucesso (simulação)`);
      } else {
        // Para usuários reais, usar o serviço de exclusão
        const result = await deleteUserCompletely(
          userToDelete.id,
          userToDelete.email,
          currentUser
        );

        if (result.success) {
          toast.success(result.message);
          console.log(`✅ Exclusão concluída:`, result.deletedData);
        } else {
          toast.error(result.message);
          return;
        }
      }

      // Atualizar a lista de usuários
      const allUsers = await getAdminUsers();
      setUsers(allUsers);

      // Fechar modal e limpar estados
      handleCloseModals();
      
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Dashboard Avançado
        </TabsTrigger>
        <TabsTrigger value="dashboard" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Resultados & Estatísticas
        </TabsTrigger>
        <TabsTrigger value="plans" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Gerenciar Planos
        </TabsTrigger>
      </TabsList>

      {/* Aba de Dashboard Avançado */}
      <TabsContent value="analytics" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard Avançado</h2>
            <p className="text-muted-foreground">Análise completa do desempenho do sistema</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={statsLoading}
            className="flex items-center gap-2"
          >
            <Activity className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Métricas Principais em Tempo Real */}
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Hoje</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    R$ {stats.revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.revenueToday > 0 ? 'Receitas do dia atual' : 'Nenhuma receita hoje'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Semana</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {stats.revenueWeek.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Últimos 7 dias
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Mês</p>
                  <p className="text-2xl font-bold text-purple-600">
                    R$ {stats.revenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Últimos 30 dias
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Melhor Dia</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.bestDay.date}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {stats.bestDay.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas
                  </p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Hoje</p>
                  <p className="text-2xl font-bold text-emerald-600">R$ 0,00</p>
                  <p className="text-xs text-muted-foreground">Nenhuma receita hoje</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Semana</p>
                  <p className="text-2xl font-bold text-blue-600">R$ 0,00</p>
                  <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Mês</p>
                  <p className="text-2xl font-bold text-purple-600">R$ 0,00</p>
                  <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Melhor Dia</p>
                  <p className="text-2xl font-bold text-orange-600">N/A</p>
                  <p className="text-xs text-muted-foreground">Nenhuma receita registrada</p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>
        )}

        {/* Gráfico de Vendas Mensais */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Vendas Mensais
          </h3>
          <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-16 w-16 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">
                Gráfico de vendas mensais será implementado aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Mostrando vendas dos últimos 12 meses
              </p>
            </div>
          </div>
        </Card>

        {/* Gráficos e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Gráfico de Receita por Mês */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Receita Total: R$ {stats?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Receita Hoje</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: stats ? `${Math.min((stats.revenueToday / Math.max(stats.totalRevenue, 1)) * 100, 100)}%` : '0%' }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    R$ {stats?.revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Receita Semanal</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: stats ? `${Math.min((stats.revenueWeek / Math.max(stats.totalRevenue, 1)) * 100, 100)}%` : '0%' }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    R$ {stats?.revenueWeek.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Receita Mensal</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full">
                    <div 
                      className="h-full bg-purple-500 rounded-full" 
                      style={{ width: stats ? `${Math.min((stats.revenueMonth / Math.max(stats.totalRevenue, 1)) * 100, 100)}%` : '0%' }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    R$ {stats?.revenueMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Melhor Dia</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-orange-600">
                    {stats?.bestDay.date || 'N/A'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    R$ {stats?.bestDay.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
              {stats && stats.totalRevenue === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma receita registrada ainda
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Análise de Planos Mais Populares */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Planos Mais Populares
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-sm font-medium">Ultimate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full">
                    <div className="w-2/3 h-full bg-primary rounded-full"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">2 usuários (67%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium">Standard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full">
                    <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">1 usuário (33%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full">
                    <div className="w-0 h-full bg-muted-foreground rounded-full"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">0 usuários (0%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-sm font-medium">Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full">
                    <div className="w-0 h-full bg-muted-foreground rounded-full"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">0 usuários (0%)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Comparativos e Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Crescimento de Usuários */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Crescimento de Usuários</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Este Mês</span>
                <span className="text-sm font-semibold text-emerald-600">+3 usuários</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Mês Anterior</span>
                <span className="text-sm text-muted-foreground">+0 usuários</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Crescimento</span>
                <span className="text-sm font-semibold text-emerald-600">∞% ↗️</span>
              </div>
            </div>
          </Card>

          {/* Métricas de Engajamento */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Métricas de Engajamento</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Taxa de Conversão</span>
                <span className="text-sm font-semibold text-primary">100%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Usuários Ativos</span>
                <span className="text-sm font-semibold text-blue-600">3/3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Retenção</span>
                <span className="text-sm font-semibold text-emerald-600">100%</span>
              </div>
            </div>
          </Card>

          {/* Projeções */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Projeções</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Próximo Mês</span>
                <span className="text-sm font-semibold text-purple-600">R$ 31,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Meta Anual</span>
                <span className="text-sm font-semibold text-orange-600">R$ 372,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Crescimento Esperado</span>
                <span className="text-sm font-semibold text-emerald-600">+3,300%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Alertas e Recomendações */}
        <Card className="p-6 border-l-4 border-l-yellow-500">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Alertas e Recomendações
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>🎯 Oportunidade:</strong> Considere criar campanhas de marketing para o plano Medium, que ainda não tem usuários.
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>📈 Tendência:</strong> O plano Ultimate está sendo o mais escolhido. Considere criar um plano ainda mais premium.
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                <strong>✅ Excelente:</strong> Taxa de conversão de 100% indica que o produto está bem posicionado no mercado.
              </p>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* Aba de Resultados e Estatísticas */}
      <TabsContent value="dashboard" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Resultados & Estatísticas</h2>
            <p className="text-muted-foreground">Visão geral do desempenho do sistema</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={statsLoading}
            className="flex items-center gap-2"
          >
            <Activity className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>


        {/* Loading ou Erro */}
        {statsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{statsError}</AlertDescription>
          </Alert>
        )}

        {/* Estatísticas Principais */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total de Usuários"
              value={stats.totalUsers.toLocaleString()}
              icon={Users}
              trend={{ value: stats.growthRate, isPositive: stats.growthRate > 0 }}
            />
            <StatCard
              title="Usuários Ativos"
              value={stats.activeUsers.toLocaleString()}
              icon={UserCheck}
            />
            <StatCard
              title="Receita Total"
              value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
            />
            <StatCard
              title="Taxa de Crescimento"
              value={`${stats.growthRate.toFixed(1)}%`}
              icon={TrendingUp}
              trend={{ value: stats.growthRate, isPositive: stats.growthRate > 0 }}
            />
          </div>
        )}

        {/* Gráficos e Métricas Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição de Planos */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Planos</h3>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-2 bg-muted rounded-full animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-8 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {Object.entries(stats.planDistribution).map(([plan, count]) => {
                  const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
                  const planInfo = availablePlans.find(p => p.id === plan);
                  
                  return (
                    <div key={plan} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{planInfo?.name || plan}</span>
                          <Badge variant="outline" className="text-xs">
                            {count} usuários
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>

          {/* Atividade Recente */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-3">
                {stats.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  stats.recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm">{activity.action}</span>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </Card>
        </div>

        {/* Lista de Usuários */}
        <Card className="shadow-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Usuários do Sistema ({filteredUsers.length})</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar usuários..." 
                    className="w-64 pl-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline">Filtros</Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {usersLoading ? (
              <div className="p-4 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : (
              <div className="min-w-full">
                <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Usuário</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Plano</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Expira em</th>
                    <th className="text-left p-4 font-semibold">Registrado em</th>
                    <th className="text-left p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        {searchTerm ? 'Nenhum usuário encontrado para a busca.' : 'Nenhum usuário encontrado.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{user.name}</td>
                        <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                        <td className="p-4">
                          <Badge 
                            variant={user.plan === 'free' ? 'secondary' : 'default'} 
                            className="capitalize"
                          >
                            {user.plan}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {user.planExpirationDate ? 
                            (user.planExpirationDate.toDate ? 
                              user.planExpirationDate.toDate().toLocaleDateString('pt-BR') : 
                              new Date(user.planExpirationDate).toLocaleDateString('pt-BR')
                            ) : 
                            user.plan === 'free' ? 'N/A' : 'Não definido'
                          }
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString('pt-BR') : new Date(user.createdAt).toLocaleDateString('pt-BR')) : 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewDetails(user)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Ver Detalhes
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteUser(user)}
                              className="flex items-center gap-1"
                              disabled={!canDeleteUserSync(user.id)}
                            >
                              <X className="h-3 w-3" />
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </TabsContent>

      {/* Aba de Gerenciamento de Planos */}
      <TabsContent value="plans" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Planos</h2>
          <p className="text-muted-foreground">Alterar planos de usuários por email</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Alteração de Plano */}
          <Card className="p-6 relative z-50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Alterar Plano de Usuário
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Email do Usuário</Label>
                <div className="mt-1">
                  <EmailAutocomplete
                    placeholder="Digite o email do usuário"
                    onUserSelect={(user: UserSearchResult) => {
                      setUserEmail(user.email);
                      setUserSearchResult({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName
                      });
                    }}
                    onSearch={(email: string) => {
                      setUserEmail(email);
                      handleUserSearch();
                    }}
                  />
                </div>
              </div>

              {userSearchResult && (
                <Alert>
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Nome:</strong> {userSearchResult.name || 'Nome não informado'}</p>
                      <p><strong>Email:</strong> {userSearchResult.email || 'Email não informado'}</p>
                      <div className="flex items-center gap-2">
                        <strong>Plano Atual:</strong> 
                        <Badge className="capitalize">
                          {(userSearchResult as any).currentPlan || 'free'}
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {userSearchResult && (
                <>
                  <div>
                    <Label htmlFor="newPlan">Novo Plano</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o novo plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlans.map((plan) => (
                          <SelectItem 
                            key={plan.id} 
                            value={plan.id}
                            disabled={plan.id === userSearchResult.currentPlan}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{plan.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                R$ {plan.price.toFixed(2)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reason">Motivo da Alteração (opcional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Ex: Upgrade promocional, correção de problema, etc."
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {selectedPlan && selectedPlan !== 'free' && (
                    <div>
                      <Label htmlFor="subscriptionMonths">Meses de Assinatura</Label>
                      <Input
                        id="subscriptionMonths"
                        type="number"
                        placeholder="Ex: 12 (para 1 ano)"
                        value={subscriptionMonths}
                        onChange={(e) => setSubscriptionMonths(parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="1"
                        max="120"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deixe vazio para não definir período específico
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handlePlanUpdate}
                    disabled={isUpdatingPlan || !selectedPlan || selectedPlan === userSearchResult.currentPlan}
                    className="w-full"
                  >
                    {isUpdatingPlan ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Alterando Plano...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Alterar Plano
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Histórico de Alterações */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Alterações
            </h3>
            
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {planChangeHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma alteração de plano registrada
                  </p>
                ) : (
                  planChangeHistory.map((change) => (
                    <div key={change.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{change.userEmail}</span>
                          <Badge variant="outline" className="text-xs">
                            {change.newPlan}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {change.previousPlan} → {change.newPlan}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Alterado por: {(change as any).updatedBy || change.changedBy}
                        </p>
                        {change.reason && (
                          <p className="text-xs text-muted-foreground">
                            Motivo: {change.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {(change.createdAt as any)?.toDate ? (change.createdAt as any).toDate().toLocaleString('pt-BR') : new Date(change.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Gerenciamento de Administradores */}
        <Card className="p-6 relative z-10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Administradores
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label>Email do Usuário para Promover</Label>
              <div className="mt-1">
                <EmailAutocomplete
                  placeholder="Digite o email do usuário"
                  onUserSelect={(user: UserSearchResult) => {
                    setAdminEmail(user.email);
                    setAdminSearchResult({
                      uid: user.uid,
                      email: user.email,
                      displayName: user.displayName
                    });
                  }}
                  onSearch={(email: string) => {
                    setAdminEmail(email);
                    handleAdminSearch();
                  }}
                />
              </div>
            </div>

            {adminSearchResult && (
              <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Nome:</strong> {adminSearchResult.name}</p>
                    <p><strong>Email:</strong> {adminSearchResult.email}</p>
                    <p><strong>Status:</strong> 
                      <Badge className="ml-2" variant="outline">
                        Usuário Regular
                      </Badge>
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {adminSearchResult && (
              <>
                <div>
                  <Label htmlFor="adminReason">Motivo da Promoção (opcional)</Label>
                  <Textarea
                    id="adminReason"
                    placeholder="Ex: Responsável pela equipe, suporte técnico, etc."
                    value={adminReason}
                    onChange={(e) => setAdminReason(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleAdminPromotion}
                  disabled={isPromotingAdmin}
                  className="w-full bg-gradient-primary"
                >
                  {isPromotingAdmin ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Promovendo...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Promover a Administrador
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Lista de Administradores Atuais */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Administradores Atuais
          </h3>
          
          {adminsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {adminsList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum administrador encontrado
                </p>
              ) : (
                adminsList.map((admin) => (
                  <div key={admin.userId} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{admin.email}</span>
                          <Badge variant="default" className="bg-gradient-primary">
                            Admin
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Promovido por: {admin.promotedBy || 'Sistema'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {admin.addedAt ? 
                            (admin.addedAt.toDate ? admin.addedAt.toDate().toLocaleString('pt-BR') : admin.addedAt.toString()) 
                            : 'Data não disponível'}
                        </p>
                      </div>
                      {admin.email !== currentUser?.email && admin.userId !== 'hardcoded' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAdminDemotion(admin.email)}
                        >
                          Remover Admin
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Informações dos Planos */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Planos Disponíveis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availablePlans.map((plan) => (
              <div key={plan.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{plan.name}</h4>
                    <Badge variant={plan.price === 0 ? 'secondary' : 'default'}>
                      R$ {plan.price.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      {/* Modal de Edição de Usuário */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Usuário: {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={selectedUser.name} readOnly className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={selectedUser.email} readOnly className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plano Atual</Label>
                  <div className="mt-1">
                    <Badge className="capitalize">
                      {selectedUser.plan}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedUser.status === 'active' ? 'default' : 'secondary'}>
                      {selectedUser.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Alteração de Plano Rápida */}
              <div>
                <Label>Alterar Plano</Label>
                <div className="mt-2 flex gap-2">
                  <Select defaultValue={selectedUser.plan} onValueChange={(value) => {
                    // Aqui você pode implementar a lógica de alteração rápida
                    console.log('Alterando plano para:', value);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aplicar
                  </Button>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseModals}>
                  Cancelar
                </Button>
                <Button onClick={handleCloseModals}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Usuário */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Usuário: {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Informações Pessoais</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Nome:</strong> {selectedUser.name}</div>
                    <div><strong>Email:</strong> {selectedUser.email}</div>
                    <div><strong>ID:</strong> <code className="text-xs">{selectedUser.id}</code></div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Status da Conta</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <strong>Plano:</strong> 
                      <Badge className="capitalize">
                        {selectedUser.plan}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong> 
                      <Badge variant={selectedUser.status === 'active' ? 'default' : 'secondary'}>
                        {selectedUser.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div><strong>Plano expira em:</strong> {
                      selectedUser.planExpirationDate ? 
                        (selectedUser.planExpirationDate.toDate ? 
                          selectedUser.planExpirationDate.toDate().toLocaleDateString('pt-BR') : 
                          new Date(selectedUser.planExpirationDate).toLocaleDateString('pt-BR')
                        ) : 
                        selectedUser.plan === 'free' ? 'N/A' : 'Não definido'
                    }</div>
                    <div><strong>Registrado em:</strong> {
                      selectedUser.createdAt ? 
                        (selectedUser.createdAt.toDate ? selectedUser.createdAt.toDate().toLocaleDateString('pt-BR') : new Date(selectedUser.createdAt).toLocaleDateString('pt-BR')) 
                        : 'N/A'
                    }</div>
                    {selectedUser.lastLogin && (
                      <div><strong>Último acesso:</strong> {
                        selectedUser.lastLogin.toDate ? selectedUser.lastLogin.toDate().toLocaleDateString('pt-BR') : new Date(selectedUser.lastLogin).toLocaleDateString('pt-BR')
                      }</div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Estatísticas do Usuário */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Estatísticas de Uso</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-semibold text-lg">-</div>
                    <div className="text-muted-foreground">Transações</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-semibold text-lg">-</div>
                    <div className="text-muted-foreground">Funcionários</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-semibold text-lg">-</div>
                    <div className="text-muted-foreground">Relatórios</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-semibold text-lg">-</div>
                    <div className="text-muted-foreground">Dias Ativo</div>
                  </div>
                </div>
              </Card>

              {/* Histórico de Atividades */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Atividades Recentes</h3>
                <div className="text-sm text-muted-foreground text-center py-4">
                  Histórico de atividades em desenvolvimento
                </div>
              </Card>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseModals}>
                  Fechar
                </Button>
                <Button onClick={() => {
                  handleCloseModals();
                  handleEditUser(selectedUser);
                }}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar Usuário
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="h-5 w-5" />
              Confirmar Exclusão de Usuário
            </DialogTitle>
          </DialogHeader>
          
          {userToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium mb-2">
                  ⚠️ Atenção: Esta ação não pode ser desfeita
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Todos os dados do usuário serão excluídos permanentemente</li>
                  <li>• Histórico de transações será removido</li>
                  <li>• Configurações e preferências serão perdidas</li>
                  <li>• Acesso ao sistema será revogado</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Usuário a ser excluído:</p>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{userToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                  <p className="text-sm text-muted-foreground">Plano: {userToDelete.plan}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: <code className="text-xs">{userToDelete.id}</code>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Dados que serão excluídos:</p>
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-sm">• Perfil e configurações do usuário</p>
                  <p className="text-sm">• Todos os funcionários cadastrados</p>
                  <p className="text-sm">• Histórico completo de transações</p>
                  <p className="text-sm">• Plataformas de apostas configuradas</p>
                  <p className="text-sm">• Histórico de alterações de plano</p>
                  <p className="text-sm">• Acesso ao sistema será revogado</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deleteConfirmation">
                  Para confirmar, digite <strong>excluir</strong>:
                </Label>
                <Input
                  id="deleteConfirmation"
                  placeholder="Digite 'excluir' para confirmar"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="border-destructive/50 focus:border-destructive"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseModals}>
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting || deleteConfirmation.toLowerCase() !== 'excluir'}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Excluir Usuário
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default AdminTabs;
