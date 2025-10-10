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
import { getAllUsers, AdminUser } from '@/core/services/admin-data.service';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  findUserByEmail, 
  updateUserPlan, 
  getPlanChangeHistory, 
  getAvailablePlans,
  isValidPlan,
  PlanChangeHistory 
} from '@/core/services/admin-plan-management.service';
import { 
  promoteUserToAdmin,
  demoteUserFromAdmin,
  getAllAdmins,
  getAdminPromotionHistory,
  getAdminDemotionHistory,
  AdminPromotion,
  AdminDemotion
} from '@/core/services/admin-promotion.service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, UserCheck } from 'lucide-react';

const AdminTabs = () => {
  const { user, isAdmin } = useFirebaseAuth();
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

  const availablePlans = getAvailablePlans();

  // Buscar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        toast.error('Erro ao carregar usuários');
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
        setPlanChangeHistory(history.sort((a, b) => 
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        ));
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
        setAdminPromotionHistory(promotions.sort((a, b) => 
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        ));
        setAdminDemotionHistory(demotions.sort((a, b) => 
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        ));
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
      toast.error('Por favor, insira um email válido');
      return;
    }

    try {
      setIsSearchingUser(true);
      const user = await findUserByEmail(userEmail.trim());
      setUserSearchResult(user);
      setSelectedPlan(user.currentPlan);
    } catch (error) {
      setUserSearchResult(null);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar usuário');
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
        user?.email || '',
        changeReason || undefined
      );

      // Limpar formulário
      setUserEmail('');
      setSelectedPlan('');
      setChangeReason('');
      setUserSearchResult(null);

      // Atualizar dados
      refetch();
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Atualizar histórico
      const history = await getPlanChangeHistory();
      setPlanChangeHistory(history.sort((a, b) => 
        b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      ));

    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleAdminSearch = async () => {
    if (!adminEmail.trim()) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    try {
      setIsSearchingAdmin(true);
      const foundUser = await findUserByEmail(adminEmail.trim());
      setAdminSearchResult(foundUser);
    } catch (error) {
      setAdminSearchResult(null);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar usuário');
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
        user?.email || '',
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
      setAdminPromotionHistory(promotions.sort((a, b) => 
        b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      ));
      setAdminDemotionHistory(demotions.sort((a, b) => 
        b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      ));

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
        user?.email || '',
        'Remoção via painel administrativo'
      );

      // Atualizar dados
      const [admins, demotions] = await Promise.all([
        getAllAdmins(),
        getAdminDemotionHistory()
      ]);
      
      setAdminsList(admins);
      setAdminDemotionHistory(demotions.sort((a, b) => 
        b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      ));

    } catch (error) {
      console.error('Erro ao remover privilégios de admin:', error);
    }
  };

  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="dashboard" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Resultados & Estatísticas
        </TabsTrigger>
        <TabsTrigger value="plans" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Gerenciar Planos
        </TabsTrigger>
      </TabsList>

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
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Usuário</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Plano</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Registrado em</th>
                    <th className="text-left p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
                          {user.createdAt ? user.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Editar</Button>
                            <Button size="sm" variant="outline">Ver Detalhes</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Alterar Plano de Usuário
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="userEmail">Email do Usuário</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                  <Button 
                    onClick={handleUserSearch}
                    disabled={isSearchingUser || !userEmail.trim()}
                    variant="outline"
                  >
                    {isSearchingUser ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {userSearchResult && (
                <Alert>
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Nome:</strong> {userSearchResult.name}</p>
                      <p><strong>Email:</strong> {userSearchResult.email}</p>
                      <p><strong>Plano Atual:</strong> 
                        <Badge className="ml-2 capitalize">
                          {userSearchResult.currentPlan}
                        </Badge>
                      </p>
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
                          Alterado por: {change.updatedBy}
                        </p>
                        {change.reason && (
                          <p className="text-xs text-muted-foreground">
                            Motivo: {change.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {change.createdAt.toDate().toLocaleString('pt-BR')}
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
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Administradores
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminEmail">Email do Usuário para Promover</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
                <Button 
                  onClick={handleAdminSearch}
                  disabled={isSearchingAdmin || !adminEmail.trim()}
                  variant="outline"
                >
                  {isSearchingAdmin ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
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
                      {admin.email !== user?.email && admin.userId !== 'hardcoded' && (
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
    </Tabs>
  );
};

export default AdminTabs;
