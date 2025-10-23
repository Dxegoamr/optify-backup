import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import AdminTabs from '@/components/admin/AdminTabs';

const Admin = () => {
  const { user, isAdmin } = useFirebaseAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">Painel Administrativo</h1>
            {isAdmin && (
              <Badge variant="default" className="flex items-center gap-1 bg-gradient-primary">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Gerencie usuários e configurações do sistema • Acesso restrito • {user?.email}
          </p>
        </div>

        <AdminTabs />
      </div>
    </DashboardLayout>
  );
};

export default Admin;
