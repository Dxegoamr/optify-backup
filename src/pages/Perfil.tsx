import { useState } from 'react';
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
import { UserCircle, CreditCard, Trash2 } from 'lucide-react';
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

const Perfil = () => {
  const { user, logout } = useFirebaseAuth();
  const navigate = useNavigate();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSave = () => {
    toast.success('Perfil atualizado com sucesso!');
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

      // Preferir um campo de plano salvo no Firestore ou o badge/plan do usuário
      const planValue = (user?.planId || user?.plan || 'standard').toString().toLowerCase();
      const body = {
        // Enviar o identificador do plano para o backend buscar no Firestore (id, slug ou nome)
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

  const mockPaymentHistory = [
    { date: '2024-10-01', plan: 'Ultimate', amount: 199, status: 'paid' },
    { date: '2024-09-01', plan: 'Ultimate', amount: 199, status: 'paid' },
    { date: '2024-08-01', plan: 'Standard', amount: 49, status: 'paid' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
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
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <Badge variant="default" className="capitalize">
                  {user?.plan}
                </Badge>
                {user?.isAdmin && (
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
              <Label>Nome Completo</Label>
              <Input defaultValue={user?.name} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" defaultValue={user?.email} />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input type="tel" placeholder="(11) 99999-9999" />
            </div>

            <div className="space-y-2">
              <Label>CPF/CNPJ</Label>
              <Input placeholder="000.000.000-00" />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave}>Salvar Alterações</Button>
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
              <p className="text-xl font-bold capitalize">{user?.plan}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Próximo Pagamento</p>
              <p className="text-xl font-bold">01/11/2024</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
              <p className="text-xl font-bold">
                {user?.plan === 'free' ? 'Grátis' : 
                 user?.plan === 'standard' ? 'R$ 49' :
                 user?.plan === 'medium' ? 'R$ 99' : 'R$ 199'}
              </p>
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
            <h3 className="text-lg font-semibold">Histórico de Pagamentos</h3>
          </div>

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
                {mockPaymentHistory.map((payment, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">{payment.plan}</td>
                    <td className="p-4 font-semibold">R$ {payment.amount}</td>
                    <td className="p-4">
                      <Badge variant="default">Pago</Badge>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">Download</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
