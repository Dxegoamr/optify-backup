import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { useMobile } from '@/hooks/useMobile';
import { usePreload } from '@/hooks/usePreload';
import { useNotificationMonitor } from '@/hooks/useNotificationMonitor';
import { AIAssistant } from '@/components/ai-assistant/AIAssistant';
import { isAdminEmail } from '@/core/services/admin.service';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut,
  PieChart,
  TrendingUp,
  Shield,
  UserCircle,
  Gift,
  Clock,
  Crown,
  Menu,
  X,
  Target,
  Wallet,
  Calculator,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Briefcase
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useFirebaseAuth();
  const { canAccess, currentPlan } = usePlanLimitations();
  const { preloadOnHover, preloadOnIdle } = usePreload();
  
  // Monitorar eventos e disparar notificações automaticamente
  useNotificationMonitor();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    visaoGeral: true,
    gestao: true,
    financeiro: true,
    ferramentas: true,
    administracao: true,
  });
  const isMobile = useMobile();

  // Fechar sidebar automaticamente quando mudar para desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Bloquear scroll do body quando sidebar estiver aberta no mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  // Preload de rotas críticas quando o componente carrega
  useEffect(() => {
    preloadOnIdle();
  }, [preloadOnIdle]);

  // Fechar sidebar quando navegar em mobile
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Fechar sidebar quando clicar no overlay
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  // Toggle de grupo expansível
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Estrutura de grupos de menu
  interface MenuItem {
    icon: any;
    label: string;
    path: string;
    requiredFeature?: string;
  }

  interface MenuGroup {
    key: string;
    label: string;
    icon: any;
    items: MenuItem[];
  }

  const menuGroups: MenuGroup[] = [
    {
      key: 'visaoGeral',
      label: 'Visão Geral',
      icon: BarChart3,
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', requiredFeature: 'dashboard' },
        { icon: FileText, label: 'Resumo do Dia', path: '/resumo-dia', requiredFeature: 'dailySummary' },
        { icon: TrendingUp, label: 'Relatórios', path: '/relatorios', requiredFeature: 'reports' },
      ]
    },
    {
      key: 'gestao',
      label: 'Gestão',
      icon: Briefcase,
      items: [
        { icon: Users, label: 'Funcionários', path: '/gestao-funcionarios', requiredFeature: 'dashboard' },
        { icon: PieChart, label: 'Saldos', path: '/saldos', requiredFeature: 'balances' },
      ]
    },
    {
      key: 'financeiro',
      label: 'Financeiro',
      icon: DollarSign,
      items: [
        { icon: DollarSign, label: 'Pagamentos', path: '/pagamentos', requiredFeature: 'payments' },
        { icon: Calendar, label: 'Histórico', path: '/historico', requiredFeature: 'history' },
        ...((isAdmin || isAdminEmail(user?.email)) ? [{ icon: Wallet, label: 'Gestor de Caixa', path: '/gestor-caixa', requiredFeature: 'dashboard' }] : []),
      ]
    },
    {
      key: 'ferramentas',
      label: 'Ferramentas de Apostas',
      icon: Target,
      items: [
        { icon: Target, label: 'FreeBet', path: '/freebet', requiredFeature: 'dashboard' },
        { icon: Calculator, label: 'Calculadora Dutching', path: '/calculadora-dutching', requiredFeature: 'dashboard' },
        { icon: TrendingUp, label: 'Surebet', path: '/surebet', requiredFeature: 'dashboard' },
      ]
    },
  ];

  // Itens fixos (não em grupos)
  const fixedItems: MenuItem[] = [
    { icon: Crown, label: 'Planos', path: '/planos', requiredFeature: 'dashboard' },
    ...((isAdmin || isAdminEmail(user?.email)) ? [{ icon: Gift, label: 'Afiliados', path: '/afiliados', requiredFeature: 'dashboard' }] : []),
  ];

  // Verificar se o usuário realmente é admin (verificação rigorosa)
  // Só considerar admin se o usuário existir E for realmente admin
  const userIsAdmin = Boolean(
    user && 
    user.email && 
    (isAdmin === true || isAdminEmail(user.email) === true)
  );
  
  // Debug: Log admin status
  console.log('🔍 Admin Debug:', {
    hasUser: !!user,
    userEmail: user?.email,
    isAdmin,
    isAdminEmailResult: isAdminEmail(user?.email),
    userIsAdmin,
    willShowAdmin: userIsAdmin
  });
  
  // Exibir item Admin APENAS se o usuário for realmente admin
  const adminItem = userIsAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin', requiredFeature: 'advancedPanel' }] : [];
  
  // Log adicional para debug
  if (user && !userIsAdmin) {
    console.log('🚫 Admin item NÃO será exibido para:', user.email);
  }
  
  const bottomNavItems = [
    { icon: UserCircle, label: 'Perfil', path: '/perfil' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
    ...adminItem,
  ];

  // Debug: Log bottom nav items
  console.log('🔍 Bottom Nav Debug:', {
    adminItem,
    bottomNavItems,
    adminItemLength: adminItem.length
  });

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logout realizado com sucesso!');
  };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-sidebar border-b border-sidebar-border/50 z-50 lg:hidden shadow-lg">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <button 
              onClick={() => handleNavigate('/dashboard')} 
              className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg p-1"
              aria-label="Ir para Dashboard"
            >
              <svg 
                className="w-8 h-8 text-primary" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
                <path d="M11 3 8 9l4 13 4-13-3-6"/>
                <path d="M2 9h20"/>
              </svg>
              <h1 className="text-xl font-black text-foreground">Optify</h1>
            </button>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>
      )}

      {/* Overlay para mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 sm:w-72 lg:w-80 bg-sidebar border-r border-sidebar-border flex flex-col shadow-xl 
        fixed left-0 top-0 h-screen z-50 overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
      `}>
        <div className="p-8 border-b border-sidebar-border/50">
          {/* Botão de fechar para mobile */}
          {isMobile && (
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>
          )}
          
          <button onClick={() => handleNavigate('/dashboard')} className="flex items-center gap-3 mb-4">
            <svg 
              className="w-10 h-10 text-primary" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
              <path d="M11 3 8 9l4 13 4-13-3-6"/>
              <path d="M2 9h20"/>
            </svg>
            <h1 className="text-2xl font-black text-foreground">
              Optify
            </h1>
          </button>
          <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Plano Atual</p>
            <p className="text-sm font-bold text-primary capitalize">{currentPlan}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Grupos de Menu Expansíveis */}
          {menuGroups.map((group) => {
            const isExpanded = expandedGroups[group.key];
            const hasActiveItem = group.items.some(item => isActive(item.path));
            
            return (
              <div key={group.key} className="space-y-1">
                {/* Cabeçalho do Grupo */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all group ${
                    hasActiveItem
                      ? 'bg-sidebar-accent/50 text-foreground'
                      : 'hover:bg-sidebar-accent/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </button>

                {/* Itens do Grupo */}
                {isExpanded && (
                  <div className="ml-4 space-y-1 border-l-2 border-sidebar-border/30 pl-3">
                    {group.items.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        onMouseEnter={() => preloadOnHover(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                          isActive(item.path)
                            ? 'bg-gradient-primary text-primary-foreground shadow-glow scale-[1.02]'
                            : 'hover:bg-sidebar-accent text-muted-foreground hover:text-foreground hover:scale-[1.02]'
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isActive(item.path) ? '' : 'group-hover:scale-110 transition-transform'}`} />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Itens Fixos (não em grupos) */}
          <div className="pt-4 space-y-1 border-t border-sidebar-border/50 mt-4">
            {fixedItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => preloadOnHover(item.path)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  isActive(item.path)
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow scale-105'
                    : 'hover:bg-sidebar-accent text-muted-foreground hover:text-foreground hover:scale-105'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive(item.path) ? '' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border/50 space-y-1">
          {/* Grupo Administração (apenas para admins) */}
          {userIsAdmin && (
            <div className="space-y-1 mb-2">
              <button
                onClick={() => toggleGroup('administracao')}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive('/admin')
                    ? 'bg-sidebar-accent/50 text-foreground'
                    : 'hover:bg-sidebar-accent/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Administração</span>
                </div>
                {expandedGroups.administracao ? (
                  <ChevronDown className="h-4 w-4 transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 transition-transform" />
                )}
              </button>

              {expandedGroups.administracao && (
                <div className="ml-4 space-y-1 border-l-2 border-sidebar-border/30 pl-3">
                  <button
                    onClick={() => handleNavigate('/admin')}
                    onMouseEnter={() => preloadOnHover('/admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      isActive('/admin')
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow scale-[1.02]'
                        : 'hover:bg-sidebar-accent text-muted-foreground hover:text-foreground hover:scale-[1.02]'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-semibold">Admin</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Configurações (fixo no rodapé) */}
          <div className="space-y-1">
            {bottomNavItems.filter(item => item.path !== '/admin').map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => preloadOnHover(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'hover:bg-sidebar-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-semibold">Sair</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Confirmar Logout</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted hover:bg-muted/80 text-foreground border-border">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Sair da Conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        flex-1 overflow-y-auto bg-gradient-to-br from-background to-background/95 
        ${isMobile ? 'ml-0 pt-16' : 'ml-64 sm:ml-72 lg:ml-80'}
      `}>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default DashboardLayout;
