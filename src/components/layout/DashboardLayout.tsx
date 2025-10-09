import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
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
  Clock
} from 'lucide-react';
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
  const { user, logout } = useFirebaseAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Funcionários', path: '/gestao-funcionarios' },
    { icon: DollarSign, label: 'Pagamentos', path: '/pagamentos' },
    { icon: FileText, label: 'Resumo do Dia', path: '/resumo-dia' },
    { icon: PieChart, label: 'Saldos', path: '/saldos' },
    { icon: TrendingUp, label: 'Relatórios', path: '/relatorios' },
    { icon: Calendar, label: 'Histórico', path: '/historico' },
    { icon: Clock, label: 'Histórico Diário', path: '/historico-diario' },
    { icon: Gift, label: 'Afiliados', path: '/afiliados' },
    ...(user?.isAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ];

  const bottomNavItems = [
    { icon: UserCircle, label: 'Perfil', path: '/perfil' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logout realizado com sucesso!');
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col shadow-xl fixed left-0 top-0 h-screen z-50">
        <div className="p-8 border-b border-sidebar-border/50">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 mb-4">
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
            <p className="text-sm font-bold text-primary capitalize">Free</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
        </nav>

        <div className="p-4 border-t border-sidebar-border/50 space-y-2">
          {bottomNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                isActive(item.path)
                  ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                  : 'hover:bg-sidebar-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-4 px-5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl"
              >
                <LogOut className="h-5 w-5" />
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
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-background/95 ml-72">
        <div className="p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
