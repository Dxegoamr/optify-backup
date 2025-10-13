import { ReactNode, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AdminRouteGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Lista de superadmins (mesma do backend)
const SUPER_ADMINS = [
  'diegkamor@gmail.com',
  // Adicionar outros superadmins aqui
];

export const AdminRouteGuard = ({ children, fallback }: AdminRouteGuardProps) => {
  const { user, isAdmin } = useFirebaseAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Verificar claims diretamente do token do usuário
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;
        
        const isAdmin = claims.admin === true;
        const isSuperAdmin = SUPER_ADMINS.includes(user.email || '');

        console.log('Verificação de admin:', {
          uid: user.uid,
          email: user.email,
          isAdmin,
          isSuperAdmin,
          claims,
        });

        // Se não for admin, redirecionar após um delay
        if (!isAdmin && !isSuperAdmin) {
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      } catch (err) {
        console.error('Erro ao verificar status de admin:', err);
        setError('Erro ao verificar permissões de administrador');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Verificando permissões...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Não autenticado
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erro na verificação
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Erro de Verificação</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Tentar Novamente
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar se é admin ou superadmin
  const isUserAdmin = isAdmin || SUPER_ADMINS.includes(user?.email || '');
  
  // Não é admin
  if (!isUserAdmin) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-xl">Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissões de administrador para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Redirecionando para o dashboard em alguns segundos...</p>
            </div>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // É admin - renderizar conteúdo
  return <>{children}</>;
};

export default AdminRouteGuard;
