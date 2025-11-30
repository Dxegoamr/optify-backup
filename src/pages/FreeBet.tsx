import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CardStack } from '@/components/freebet/CardStack';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, History, Target } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { FreeBetService } from '@/core/services/freebet.service';
import { FreeBetPlatform, FreeBetOperation } from '@/types/freebet';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Cores padrão para plataformas
const PLATFORM_COLORS: Record<string, string> = {
  Betano: '#FF6B35',
  Bet365: '#00D26A',
  Parimatch: '#FFD700',
  Blaze: '#FF0000',
  '1xBet': '#0066CC',
  'Betfair': '#003D82',
  'Stake': '#0052FF',
  'Betboo': '#00A859',
};

const getPlatformColor = (name: string): string => {
  return PLATFORM_COLORS[name] || '#6366F1';
};

const FreeBet = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const queryClient = useQueryClient();

  const [newOperationModalOpen, setNewOperationModalOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformColor, setNewPlatformColor] = useState('#6366F1');

  // Buscar operações
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['freebet-operations', user?.uid],
    queryFn: () => FreeBetService.getOperations(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Mostrar todas as operações no carrossel (fechadas aparecem limpas, ativas aparecem com dados)
  const activeOperations = operations;

  // Converter operações para plataformas (formato do carrossel)
  const platforms: FreeBetPlatform[] = activeOperations.map(op => {
    const funcionarios = op.funcionarios || [];
    const totalApostado = funcionarios.reduce((sum, f) => sum + (f.valorApostado || 0), 0);
    const contaVencedora = funcionarios.find(f => f.vencedor);
    const retorno = contaVencedora?.retorno || 0;

    const funcionariosComFreebet = funcionarios.filter(
      f => !f.vencedor || (f.vencedor && f.vencedorRecebeFreebet === true)
    );
    const totalConversaoSaldo = funcionariosComFreebet.reduce(
      (sum, f) => sum + (f.conversaoSaldo || 0),
      0
    );

    const lucroPrejuizo = (retorno + totalConversaoSaldo) - totalApostado;

    return {
      id: op.id,
      name: op.platformName,
      color: op.platformColor,
      employeeCount: funcionarios.length,
      totalApostado,
      lucroPrejuizo,
      operationId: op.id,
    };
  });

  // Criar nova operação
  const handleCreateOperation = async () => {
    if (!user?.uid || !newPlatformName.trim()) {
      toast.error('Digite o nome da plataforma');
      return;
    }

    try {
      const color = getPlatformColor(newPlatformName);
      const operationId = await FreeBetService.createOperation(
        user.uid,
        newPlatformName.trim(),
        color,
        0
      );

      queryClient.invalidateQueries({ queryKey: ['freebet-operations', user.uid] });
      toast.success('Operação criada com sucesso!');
      setNewOperationModalOpen(false);
      setNewPlatformName('');
      setNewPlatformColor('#6366F1');

      // Navegar para a nova operação
      navigate(`/freebet/${operationId}`);
    } catch (error) {
      toast.error('Erro ao criar operação');
      console.error(error);
    }
  };

  // Clicar no card
  const handleCardClick = (platform: FreeBetPlatform) => {
    if (platform.operationId) {
      navigate(`/freebet/${platform.operationId}`);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-background via-background/95 to-background/80 px-6 py-10 shadow-[0_40px_120px_-45px_rgba(0,0,0,0.6)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute top-1/3 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary">
                FreeBet
              </Badge>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Gerencie suas operações de FreeBet
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
                  Controle em tempo real o desempenho das suas plataformas, visualize lucros e prejuízos e feche operações com poucos cliques.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/freebet/historico')}
                className="border-white/30 bg-white/10 px-5 text-white hover:bg-white/20"
              >
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
              <Button
                onClick={() => setNewOperationModalOpen(true)}
                className="bg-primary px-5 text-primary-foreground shadow-[0_20px_50px_-25px_rgba(234,88,12,0.7)] hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Operação
              </Button>
            </div>
          </div>

          <div className="relative z-10 mt-10">
            <CardStack platforms={platforms} onCardClick={handleCardClick} />
          </div>
        </section>
      </div>

      {/* Modal Nova Operação */}
      <Dialog open={newOperationModalOpen} onOpenChange={setNewOperationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Operação FreeBet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform-name">Nome da Plataforma</Label>
              <Input
                id="platform-name"
                value={newPlatformName}
                onChange={e => {
                  const name = e.target.value;
                  setNewPlatformName(name);
                  // Auto-selecionar cor se for uma plataforma conhecida
                  const knownColor = getPlatformColor(name);
                  if (knownColor !== '#6366F1') {
                    setNewPlatformColor(knownColor);
                  }
                }}
                placeholder="Ex: Betano, Bet365, Parimatch..."
              />
            </div>
            <div>
              <Label htmlFor="platform-color">Cor da Plataforma</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="platform-color"
                  type="color"
                  value={newPlatformColor}
                  onChange={e => setNewPlatformColor(e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={newPlatformColor}
                  onChange={e => setNewPlatformColor(e.target.value)}
                  placeholder="#6366F1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOperationModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOperation}>Criar Operação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FreeBet;

