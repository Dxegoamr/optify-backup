import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { deleteUser } from 'firebase/auth';
import { auth } from '@/integrations/firebase/config';
import { deleteAllUserData } from '@/core/services/user-subcollections.service';
import { useNavigate } from 'react-router-dom';
import { UserCircle, CreditCard, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfileService, type UserProfile } from '@/core/services/user-profile.service';
import { getPlanTransactionsByUser, type PlanTransaction } from '@/core/services/plan-transactions.service';
import { PlansService } from '@/core/services/plans.service';
import { Timestamp } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Perfil = () => {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PlanTransaction[]>([]);
  const [planPrice, setPlanPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para paginação do histórico de pagamentos
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados para os campos de informações pessoais
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error('Usuário não autenticado');
      return;
    }

    // Validar se o nome foi preenchido
    if (!name.trim()) {
      toast.error('O nome completo é obrigatório');
      return;
    }

    try {
      setIsSaving(true);
      
      // Salvar informações pessoais no Firestore
      await UserProfileService.updateUserPersonalInfo(user.uid, {
        name: name.trim(),
        displayName: name.trim(),
        phone: phone.trim() || undefined,
        cpf: cpf.trim() || undefined,
      });

      // Atualizar o perfil local para refletir as mudanças
      const updatedProfile = await UserProfileService.getUserProfile(user.uid);
      setUserProfile(updatedProfile);

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar informações pessoais:', error);
      toast.error('Erro ao salvar informações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== 'sim') {
      toast.error('Digite "sim" para confirmar a exclusão');
      return;
    }
    try {
      const currentUser = auth.currentUser;
      const userId = currentUser?.uid;
      if (!currentUser || !userId) {
        toast.error('Usuário não autenticado');
        return;
      }

      // 1) Remover todos os dados do usuário no Firestore (subcoleções)
      await deleteAllUserData(userId);

      // 2) Excluir o usuário do Authentication
      await deleteUser(currentUser);

      toast.success('Conta excluída com sucesso');
      setIsDeleteDialogOpen(false);
      setDeleteConfirmation('');
      navigate('/');
    } catch (error: any) {
      // Em alguns casos, o Firebase exige reautenticação
      if (error?.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente e tente excluir a conta.');
      } else {
        toast.error('Não foi possível excluir a conta. Tente novamente.');
      }
    }
  };

  const handleDeleteDialogOpen = () => {
    setIsDeleteDialogOpen(true);
    setDeleteConfirmation('');
  };

  // Função para buscar o preço do plano do usuário
  const getPlanPrice = async (planId: string | undefined): Promise<number | null> => {
    // Valores padrão dos planos (sempre usados como fallback)
    const defaultPrices: Record<string, number> = {
      'standard': 34.90,
      'medium': 49.90,
      'ultimate': 74.90,
      'free': 0
    };

    if (!planId || planId === 'free') {
      return 0; // Plano gratuito
    }

    const normalizedPlanId = planId.toLowerCase().trim();
    
    try {
      // Primeiro, tentar buscar na coleção plans do Firestore
      // Tratar erro de índice graciosamente
      let plans: any[] = [];
      try {
        plans = await PlansService.listActivePlans();
      } catch (indexError: any) {
        // Se for erro de índice, logar mas continuar com valores padrão
        if (indexError?.code === 'failed-precondition' || indexError?.message?.includes('index')) {
          console.warn('⚠️ Índice do Firestore para plans ainda não está pronto, usando valores padrão');
        } else {
          throw indexError; // Re-throw se não for erro de índice
        }
      }
      
      // Tentar múltiplas formas de matching
      const currentPlan = plans.find(p => {
        // Comparar por ID do documento
        const planIdMatch = p.id.toLowerCase() === normalizedPlanId;
        
        // Comparar por value/slug
        const planValueMatch = p.value?.toLowerCase() === normalizedPlanId;
        
        // Comparar por nome normalizado
        const planNameNormalized = p.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s-]/g, '')
          .trim();
        const planNameMatch = planNameNormalized === normalizedPlanId || 
                             planNameNormalized.includes(normalizedPlanId) ||
                             normalizedPlanId.includes(planNameNormalized);
        
        return planIdMatch || planValueMatch || planNameMatch;
      });
      
      if (currentPlan && typeof currentPlan.price === 'number') {
        console.log(`✅ Preço do plano encontrado na coleção plans: R$ ${currentPlan.price}`);
        return currentPlan.price;
      }

      // Se não encontrou na coleção, usar preço padrão
      const defaultPrice = defaultPrices[normalizedPlanId];
      if (defaultPrice !== undefined) {
        console.log(`⚠️ Plano não encontrado na coleção plans, usando preço padrão: R$ ${defaultPrice}`);
        return defaultPrice;
      }

      console.warn(`⚠️ Plano "${planId}" não encontrado e sem preço padrão definido`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar preço do plano do Firestore:', error);
      
      // Em caso de erro, sempre usar preços padrão como fallback
      const defaultPrice = defaultPrices[normalizedPlanId];
      if (defaultPrice !== undefined) {
        console.log(`📋 Usando preço padrão devido ao erro: R$ ${defaultPrice}`);
        return defaultPrice;
      }
      
      return null;
    }
  };

  // Carregar dados do perfil e histórico de pagamentos
  useEffect(() => {
    // Evitar recarregamento durante hot reload
    let isMounted = true;

    const loadUserData = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
        }
        
        // Buscar perfil do usuário
        const profile = await UserProfileService.getUserProfile(user.uid);
        
        if (!isMounted) return;
        
        setUserProfile(profile);
        
        // Preencher campos de informações pessoais
        if (profile) {
          setName(profile.name || user?.displayName || '');
          setPhone(profile.phone || '');
          setCpf(profile.cpf || profile.cnpj || '');
        }

        // Buscar histórico de pagamentos (com tratamento de erro para índice)
        try {
          const transactions = await getPlanTransactionsByUser(user.uid);
          if (isMounted) {
            setPaymentHistory(transactions);
            // Resetar para primeira página quando os dados mudarem
            setCurrentPage(1);
          }
        } catch (error: any) {
          // Se for erro de índice, apenas logar e continuar
          if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('⚠️ Índice do Firestore para transactions_plans ainda não está pronto');
          } else {
            console.warn('⚠️ Erro ao buscar histórico de pagamentos:', error);
          }
          if (isMounted) {
            setPaymentHistory([]);
          }
        }

        // Buscar preço do plano atual usando a função robusta
        if (profile?.plano) {
          try {
            const price = await getPlanPrice(profile.plano);
            if (isMounted) {
              setPlanPrice(price);
            }
          } catch (error) {
            console.error('Erro ao buscar preço do plano:', error);
            // Usar valores padrão em caso de erro
            if (isMounted) {
              const defaultPrices: Record<string, number> = {
                'standard': 34.90,
                'medium': 49.90,
                'ultimate': 74.90,
                'free': 0
              };
              const normalizedPlanId = profile.plano.toLowerCase().trim();
              setPlanPrice(defaultPrices[normalizedPlanId] ?? null);
            }
          }
        } else {
          // Se não tiver plano definido, usar free (0)
          if (isMounted) {
            setPlanPrice(0);
          }
        }

      } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        if (isMounted) {
          toast.error('Erro ao carregar informações do perfil');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserData();

    // Cleanup para evitar atualizações de estado após unmount
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleSubscribePlan = async () => {
    if (!user?.email) {
      toast.error('Não foi possível identificar seu e-mail. Faça login novamente.');
      return;
    }

    try {
      setIsSubscribing(true);
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'optify-definitivo';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const functionsUrl = isLocal
        ? `http://localhost:5001/${projectId}/southamerica-east1/mpCreatePreference`
        : `https://southamerica-east1-${projectId}.cloudfunctions.net/mpCreatePreference`;

      // Usar o plano do perfil ou padrão
      const planValue = (userProfile?.plano || 'standard').toString().toLowerCase();
      const body = {
        plano: planValue,
        periodo: 'mensal',
        email: user.email,
      };

      const res = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error('Falha ao criar preferência de pagamento.');
        return;
      }

      const initPoint = data.initPoint || data.init_point || data.sandboxInitPoint;
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        toast.error('Link de pagamento não retornado.');
      }
    } catch (error) {
      toast.error('Erro ao iniciar assinatura.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Função auxiliar para formatar data do Firestore
  const formatFirestoreDate = (date: any): string | null => {
    if (!date) return null;
    
    try {
      let dateObj: Date;
      if (date instanceof Timestamp) {
        dateObj = date.toDate();
      } else if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return null;
      }
      
      return dateObj.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return null;
    }
  };

  // Função auxiliar para obter nome do plano formatado
  const getPlanDisplayName = (planId: string | undefined): string => {
    if (!planId) return 'Free';
    const planNames: Record<string, string> = {
      'free': 'Free',
      'standard': 'Standard',
      'medium': 'Medium',
      'ultimate': 'Ultimate'
    };
    return planNames[planId.toLowerCase()] || planId.charAt(0).toUpperCase() + planId.slice(1);
  };

  // Função auxiliar para obter status em português
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'completed': { label: 'Pago', variant: 'default' },
      'paid': { label: 'Pago', variant: 'default' },
      'pending': { label: 'Pendente', variant: 'secondary' },
      'failed': { label: 'Falhou', variant: 'destructive' },
      'refunded': { label: 'Reembolsado', variant: 'outline' }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Funções de paginação
  const totalPages = Math.ceil(paymentHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = paymentHistory.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary mb-4">
            Perfil
          </Badge>
          <h1 className="text-4xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Header */}
        <Card className="p-6 shadow-card">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <UserCircle className="h-16 w-16 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{userProfile?.name || user?.displayName || user?.email?.split('@')[0] || 'Usuário'}</h2>
                <Badge variant="default" className="capitalize">
                  {getPlanDisplayName(userProfile?.plano)}
                </Badge>
                {userProfile?.isAdmin && (
                  <Badge variant="secondary">Admin</Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-4">{user?.email}</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/planos')}>
                Gerenciar Plano
              </Button>
            </div>
          </div>
        </Card>

        {/* Personal Information */}
        <Card className="p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-6">Informações Pessoais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input 
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={loading || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={user?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone"
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                disabled={loading || isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF/CNPJ</Label>
              <Input 
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                disabled={loading || isSaving}
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSave} 
              disabled={loading || isSaving || !name.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </Card>

        {/* Plan Details */}
        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Plano Atual</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plano</p>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <p className="text-xl font-bold capitalize">{getPlanDisplayName(userProfile?.plano)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Próximo Pagamento</p>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <p className="text-xl font-bold">
                  {userProfile?.subscriptionEndDate 
                    ? formatFirestoreDate(userProfile.subscriptionEndDate) || 'Não definido'
                    : 'Não definido'}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <p className="text-xl font-bold">
                  {userProfile?.plano === 'free' 
                    ? 'Grátis' 
                    : planPrice 
                      ? `R$ ${planPrice.toFixed(2).replace('.', ',')}`
                      : 'Não disponível'}
                </p>
              )}
            </div>
          </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/planos')}>
                  Alterar Plano
                </Button>
                <Button onClick={handleSubscribePlan} disabled={isSubscribing}>
                  {isSubscribing ? 'Redirecionando...' : 'Assinar Plano'}
                </Button>
              </div>
        </Card>

        {/* Payment History */}
        <Card className="shadow-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Histórico de Pagamentos</h3>
              {!loading && paymentHistory.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total: {paymentHistory.length} {paymentHistory.length === 1 ? 'pagamento' : 'pagamentos'}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>Nenhum pagamento encontrado no histórico.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Data</th>
                      <th className="text-left p-4 font-semibold">Plano</th>
                      <th className="text-left p-4 font-semibold">Valor</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Nota Fiscal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatFirestoreDate(payment.createdAt) || 'Data não disponível'}
                        </td>
                        <td className="p-4">{getPlanDisplayName(payment.planId) || payment.planName}</td>
                        <td className="p-4 font-semibold">
                          R$ {payment.amount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // TODO: Implementar download de nota fiscal quando disponível
                              toast.info('Funcionalidade de download de nota fiscal em breve');
                            }}
                          >
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-border">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, paymentHistory.length)} de {paymentHistory.length} pagamentos
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      
                      {/* Números de página */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="min-w-[2.5rem]"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 shadow-card border-destructive/50">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">Zona de Perigo</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Uma vez que você exclua sua conta, não há como voltar atrás. Por favor, tenha certeza.
          </p>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" onClick={handleDeleteDialogOpen}>
                Excluir Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  Confirmar Exclusão de Conta
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium mb-2">
                    ⚠️ Atenção: Esta ação não pode ser desfeita
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Todos os seus dados serão excluídos permanentemente</li>
                    <li>• Seu histórico de transações será perdido</li>
                    <li>• Suas configurações serão removidas</li>
                    <li>• Você precisará criar uma nova conta para usar o sistema</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirmation" className="text-sm font-medium text-foreground">
                    Para confirmar, digite <strong>"sim"</strong> abaixo:
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    type="text"
                    placeholder="Digite 'sim' para confirmar"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="border-destructive/50 focus:border-destructive"
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted hover:bg-muted/80 text-foreground border-border">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation.toLowerCase() !== 'sim'}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Excluir Conta Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Perfil;
