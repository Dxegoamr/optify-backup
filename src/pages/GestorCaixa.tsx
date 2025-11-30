import { useMemo, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import {
  useGestorResumo,
  useGestorTransacoes,
  useGestorCategorias,
  useGestorConfiguracoes,
  useCreateGestorTransacao,
  useUpdateGestorTransacao,
  useDeleteGestorTransacao,
  useCreateGestorCategoria,
  useUpdateGestorCategoria,
  useDeleteGestorCategoria,
  useUpdateGestorConfiguracoes,
} from '@/hooks/useGestorCaixa';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Settings as SettingsIcon,
  RefreshCw,
  AlertTriangle,
  Target,
  Layout,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { GestorCategoria, GestorTransacaoPessoal } from '@/types/gestorCaixa';

const COLORS = ['#F97316', '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#22D3EE'];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

type TransacaoFormValues = {
  descricao: string;
  categoriaId: string;
  tipo: 'despesa' | 'receita';
  valor: number;
  data: string;
};

type CategoriaFormValues = {
  nome: string;
  tipo: string;
  percentual: number;
};

const GestorCaixa = () => {
  const {
    data: resumo,
    isLoading: loadingResumo,
    refetch: refetchResumo,
  } = useGestorResumo();
  const {
    data: transacoes,
    isLoading: loadingTransacoes,
    refetch: refetchTransacoes,
  } = useGestorTransacoes();
  const {
    data: categorias,
    isLoading: loadingCategorias,
    refetch: refetchCategorias,
  } = useGestorCategorias();
  const {
    data: configuracoes,
    refetch: refetchConfiguracoes,
  } = useGestorConfiguracoes();

  const { mutateAsync: createTransacao, isPending: creatingTransacao } = useCreateGestorTransacao();
  const { mutateAsync: updateTransacao, isPending: updatingTransacao } = useUpdateGestorTransacao();
  const { mutateAsync: deleteTransacao } = useDeleteGestorTransacao();
  const { mutateAsync: createCategoria, isPending: creatingCategoria } = useCreateGestorCategoria();
  const { mutateAsync: updateCategoria, isPending: updatingCategoria } = useUpdateGestorCategoria();
  const { mutateAsync: deleteCategoria } = useDeleteGestorCategoria();
  const { mutateAsync: updateConfiguracoes } = useUpdateGestorConfiguracoes();

  const [selectedTab, setSelectedTab] = useState('resumo');
  const [syncing, setSyncing] = useState(false);

  const [transacaoDialogOpen, setTransacaoDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [percentualDialogOpen, setPercentualDialogOpen] = useState(false);
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [transacaoToEdit, setTransacaoToEdit] = useState<GestorTransacaoPessoal | null>(null);
  const [categoriaToEdit, setCategoriaToEdit] = useState<GestorCategoria | null>(null);
  const [transacaoToDelete, setTransacaoToDelete] = useState<GestorTransacaoPessoal | null>(null);
  const [categoriaToDelete, setCategoriaToDelete] = useState<GestorCategoria | null>(null);
  const [percentualDrafts, setPercentualDrafts] = useState<Record<string, number>>({});

  const transacaoForm = useForm<TransacaoFormValues>({
    defaultValues: {
      descricao: '',
      categoriaId: '',
      tipo: 'despesa',
      valor: 0,
      data: new Date().toISOString().split('T')[0],
    },
  });

  const categoriaForm = useForm<CategoriaFormValues>({
    defaultValues: {
      nome: '',
      tipo: 'gasto',
      percentual: 0,
    },
  });

  const chartData = useMemo(() => {
    if (!resumo?.distribuicao?.length) {
      return [
        { categoria: 'Gastos pessoais', valor: 0 },
        { categoria: 'Investimentos', valor: 0 },
        { categoria: 'Aportes de caixa', valor: 0 },
      ];
    }
    return resumo.distribuicao;
  }, [resumo?.distribuicao]);

  const metas = resumo?.metas ?? [];
  const alertas = resumo?.alertas ?? [];

  const metaPrincipalProgresso = useMemo(() => {
    const metasConfig = configuracoes?.metas as { principal?: { progresso?: number } } | undefined;
    return metasConfig?.principal?.progresso ?? 0;
  }, [configuracoes?.metas]);

  const ultimoSync = useMemo(() => {
    const layoutConfig = configuracoes?.layout as { ultimoSync?: string } | undefined;
    return layoutConfig?.ultimoSync ?? null;
  }, [configuracoes?.layout]);

  const handleOpenTransacaoDialog = useCallback(
    (transacao?: GestorTransacaoPessoal) => {
      if (transacao) {
        setTransacaoToEdit(transacao);
        transacaoForm.reset({
          descricao: transacao.descricao || '',
          categoriaId: transacao.categoriaId || '',
          tipo: transacao.tipo,
          valor: Math.abs(transacao.valor || 0),
          data: (transacao.data || '').split('T')[0] || new Date().toISOString().split('T')[0],
        });
      } else {
        setTransacaoToEdit(null);
        transacaoForm.reset({
          descricao: '',
          categoriaId: categorias?.[0]?.id || '',
          tipo: 'despesa',
          valor: 0,
          data: new Date().toISOString().split('T')[0],
        });
      }
      setTransacaoDialogOpen(true);
    },
    [categorias, transacaoForm],
  );

  const handleOpenCategoriaDialog = useCallback(
    (categoria?: GestorCategoria) => {
      if (categoria) {
        setCategoriaToEdit(categoria);
        categoriaForm.reset({
          nome: categoria.nome,
          tipo: categoria.tipo,
          percentual: categoria.percentual ?? 0,
        });
      } else {
        setCategoriaToEdit(null);
        categoriaForm.reset({
          nome: '',
          tipo: 'gasto',
          percentual: 0,
        });
      }
      setCategoriaDialogOpen(true);
    },
    [categoriaForm],
  );

  const handleOpenPercentualDialog = useCallback(() => {
    const drafts: Record<string, number> = {};
    (categorias ?? []).forEach(cat => {
      drafts[cat.id] = cat.percentual ?? 0;
    });
    setPercentualDrafts(drafts);
    setPercentualDialogOpen(true);
  }, [categorias]);

  const handleSync = useCallback(async () => {
    try {
      setSyncing(true);
      await Promise.all([
        refetchResumo(),
        refetchTransacoes(),
        refetchCategorias(),
        refetchConfiguracoes(),
      ]);
      toast.success('Dados sincronizados com sucesso!');
      await updateConfiguracoes({
        layout: {
          ...((configuracoes?.layout as Record<string, unknown>) ?? {}),
          ultimoSync: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível sincronizar agora. Tente novamente mais tarde.');
    } finally {
      setSyncing(false);
    }
  }, [
    configuracoes?.layout,
    refetchCategorias,
    refetchConfiguracoes,
    refetchResumo,
    refetchTransacoes,
    updateConfiguracoes,
  ]);

  const onSubmitTransacao = useCallback(
    async (values: TransacaoFormValues) => {
      try {
        const payload = {
          ...values,
          valor: Number(values.valor),
          categoriaId: values.categoriaId || null,
        };

        if (transacaoToEdit) {
          await updateTransacao({ id: transacaoToEdit.id, data: payload });
          toast.success('Transação atualizada com sucesso!');
        } else {
          await createTransacao(payload);
          toast.success('Transação criada com sucesso!');
        }
        setTransacaoDialogOpen(false);
        setTransacaoToEdit(null);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao salvar transação.');
      }
    },
    [createTransacao, transacaoToEdit, updateTransacao],
  );

  const onSubmitCategoria = useCallback(
    async (values: CategoriaFormValues) => {
      try {
        const payload = {
          ...values,
          percentual: Number(values.percentual),
        };
        if (categoriaToEdit) {
          await updateCategoria({ id: categoriaToEdit.id, data: payload });
          toast.success('Categoria atualizada!');
        } else {
          await createCategoria(payload);
          toast.success('Categoria criada!');
        }
        setCategoriaDialogOpen(false);
        setCategoriaToEdit(null);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao salvar categoria.');
      }
    },
    [categoriaToEdit, createCategoria, updateCategoria],
  );

  const onSubmitPercentuais = useCallback(async () => {
    if (!categorias?.length) {
      setPercentualDialogOpen(false);
      return;
    }
    try {
      await Promise.all(
        categorias.map(cat =>
          updateCategoria({
            id: cat.id,
            data: { percentual: Number(percentualDrafts[cat.id] ?? cat.percentual ?? 0) },
          }),
        ),
      );
      toast.success('Percentuais atualizados!');
      setPercentualDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível atualizar os percentuais.');
    }
  }, [categorias, percentualDrafts, updateCategoria]);

  const handleDeleteTransacao = useCallback(async () => {
    if (!transacaoToDelete) return;
    try {
      await deleteTransacao(transacaoToDelete.id);
      toast.success('Transação removida!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover transação.');
    } finally {
      setTransacaoToDelete(null);
    }
  }, [deleteTransacao, transacaoToDelete]);

  const handleDeleteCategoria = useCallback(async () => {
    if (!categoriaToDelete) return;
    try {
      await deleteCategoria(categoriaToDelete.id);
      toast.success('Categoria removida!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover categoria.');
    } finally {
      setCategoriaToDelete(null);
    }
  }, [categoriaToDelete, deleteCategoria]);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="bg-primary/10 text-primary px-4 py-1 text-xs tracking-[0.3em] uppercase">
              Gestor de Caixa
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Controle financeiro centralizado e personalizável
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Acompanhe automaticamente depósitos, saques e lucros provenientes da Optify,
              combine com suas transações pessoais e distribua o capital entre categorias personalizadas.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
            <Button
              className="bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              onClick={() => handleOpenTransacaoDialog()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova transação
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => setLayoutDialogOpen(true)}
            >
              <SettingsIcon className="h-4 w-4" />
              Personalizar painel
            </Button>
          </div>
        </section>

        <section>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="w-full justify-start gap-2 overflow-x-auto">
              <TabsTrigger value="resumo">
                Resumo financeiro
              </TabsTrigger>
              <TabsTrigger value="distribuicao">
                Divisão do caixa
              </TabsTrigger>
              <TabsTrigger value="metas">
                Metas & Alertas
              </TabsTrigger>
              <TabsTrigger value="transacoes">
                Transações pessoais
              </TabsTrigger>
              <TabsTrigger value="categorias">
                Categorias & regras
              </TabsTrigger>
              <TabsTrigger value="layout">
                Layout & personalização
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
                {loadingResumo ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="p-6">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-4 h-8 w-32" />
                      <Skeleton className="mt-6 h-3 w-full" />
                    </Card>
                  ))
                ) : (
                  <>
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardDescription>Caixa atual</CardDescription>
                        <CardTitle className="text-3xl font-bold text-primary">
                          {formatCurrency(resumo?.caixaAtual ?? 0)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          Inclui depósitos, saques e lucros sincronizados da Optify.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Lucro diário</CardDescription>
                        <CardTitle>{formatCurrency(resumo?.lucroDiario ?? 0)}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Atualizado com base nas operações registradas até o momento.
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Lucro mensal</CardDescription>
                        <CardTitle>{formatCurrency(resumo?.lucroMensal ?? 0)}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Inclui resultados operacionais + transações pessoais.
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Gastos pessoais</CardDescription>
                        <CardTitle>{formatCurrency(resumo?.totalGastosPessoais ?? 0)}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Controlados manualmente pelo usuário dentro do gestor.
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Evolução do caixa</CardTitle>
                  <CardDescription>
                    Histórico consolidado das movimentações sincronizadas diariamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Via Optify (operações)
                        </p>
                        <p className="mt-2 text-xl font-semibold text-foreground">
                          {formatCurrency((resumo?.caixaAtual ?? 0) - (resumo?.saldoPessoal ?? 0))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Depósitos, saques e lucros registrados automaticamente.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Saldo pessoal
                        </p>
                        <p className="mt-2 text-xl font-semibold text-foreground">
                          {formatCurrency(resumo?.saldoPessoal ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Entradas e saídas cadastradas manualmente nas categorias pessoais.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                      <p>
                        A consolidação diária considera também metas e alertas definidos pelo usuário.
                        Configure regras dinâmicas para receber notificações proativas sobre seus resultados.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-muted/30 p-6">
                    <h3 className="text-sm font-semibold text-muted-foreground">Indicadores rápidos</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Resultado da semana</span>
                        <span className={cn(
                          (resumo?.lucroDiario ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500',
                          'font-semibold'
                        )}>
                          {formatCurrency((resumo?.lucroDiario ?? 0) * 5)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Meta principal</span>
                        <span className="text-muted-foreground">
                          {formatPercent(metaPrincipalProgresso)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Alertas ativos</span>
                        <span className={cn(alertas.length ? 'text-amber-500' : 'text-muted-foreground')}>
                          {alertas.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Última sincronização</span>
                        <span className="text-muted-foreground text-xs">
                          {ultimoSync
                            ? formatDistanceToNow(new Date(ultimoSync), {
                                locale: ptBR,
                                addSuffix: true,
                              })
                            : 'há poucos minutos'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribuicao">
              <Card className="border-border/60">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Como o caixa está distribuído</CardTitle>
                    <CardDescription>
                      Ajuste os percentuais de alocação por categoria e acompanhe o saldo disponível.
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={handleOpenPercentualDialog}>
                    <Target className="h-4 w-4" />
                    Ajustar percentuais
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="valor"
                          nameKey="categoria"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={4}
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.categoria}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number, _name, props) => [
                            formatCurrency(value),
                            props?.payload?.categoria ?? '',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground">Distribuição atual</h3>
                      <div className="mt-4 space-y-3 text-sm">
                        {chartData.map((item, index) => (
                          <div key={item.categoria} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              {item.categoria}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(item.valor)}{' '}
                              <span className="text-xs text-muted-foreground">
                                {item.percentual ? formatPercent(item.percentual) : ''}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
                      <p>
                        Este gráfico combina automaticamente os valores calculados via Optify com as
                        transações pessoais registradas. Ajuste as categorias para refletir seu
                        plano financeiro atual.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metas">
              <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                <Card className="border-border/60">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Metas financeiras personalizadas</CardTitle>
                      <CardDescription>Defina objetivos e acompanhe o progresso ao longo do mês.</CardDescription>
                    </div>
                    <Button className="bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova meta
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {metas.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                        Nenhuma meta registrada ainda. Crie uma meta para acompanhar objetivos de crescimento do caixa, aportes ou redução de gastos pessoais.
                      </div>
                    ) : (
                      metas.map(meta => {
                        const progressoPercent = Math.min(
                          (meta.progresso / (meta.objetivo || 1)) * 100,
                          100
                        );

                        return (
                          <div key={meta.id} className="rounded-xl border border-border/60 bg-background/80 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-semibold">{meta.titulo}</h3>
                                {meta.descricao && (
                                  <p className="text-xs text-muted-foreground">{meta.descricao}</p>
                                )}
                              </div>
                              <Badge
                                variant={meta.status === 'atingida' ? 'default' : meta.status === 'atrasada' ? 'destructive' : 'secondary'}
                              >
                                {meta.status === 'atingida' ? 'Atingida' : meta.status === 'atrasada' ? 'Atrasada' : 'Em andamento'}
                              </Badge>
                            </div>
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progresso</span>
                                <span>
                                  {formatCurrency(meta.progresso)} / {formatCurrency(meta.objetivo)}
                                </span>
                              </div>
                              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${progressoPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Alertas inteligentes</CardTitle>
                    <CardDescription>
                      Regras automatizadas que reagem às suas condições financeiras.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {alertas.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                        Nenhum alerta ativo. Configure regras condicionais para ser avisado quando metas não forem atingidas ou quando houver desvios de orçamento.
                      </div>
                    ) : (
                      alertas.map(alerta => (
                        <div key={alerta.id} className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="text-sm font-medium">{alerta.mensagem}</p>
                            <p className="text-xs text-muted-foreground">
                              gerado {formatDistanceToNow(new Date(alerta.criadoEm), { locale: ptBR, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transacoes">
              <Card className="border-border/60">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Transações pessoais</CardTitle>
                    <CardDescription>
                      Entradas e saídas controladas manualmente. Integram ao resultado diário e mensal.
                    </CardDescription>
                  </div>
                  <Button className="bg-primary px-5 text-primary-foreground hover:bg-primary/90" onClick={() => handleOpenTransacaoDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar transação
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTransacoes ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell colSpan={6}>
                                <Skeleton className="h-6 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : transacoes && transacoes.length > 0 ? (
                          transacoes.map(transacao => (
                            <TableRow key={transacao.id}>
                              <TableCell>
                                {new Date(transacao.data).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{transacao.descricao}</TableCell>
                              <TableCell>
                                {categorias?.find(cat => cat.id === transacao.categoriaId)?.nome ?? '—'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={transacao.tipo === 'receita' ? 'default' : 'secondary'}>
                                  {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                                </Badge>
                              </TableCell>
                              <TableCell className={cn(
                                'text-right font-semibold',
                                transacao.tipo === 'receita' ? 'text-emerald-500' : 'text-red-500'
                              )}>
                                {formatCurrency(
                                  transacao.tipo === 'receita' ? transacao.valor : transacao.valor * -1
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenTransacaoDialog(transacao)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() => setTransacaoToDelete(transacao)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                              Ainda não existem transações pessoais cadastradas. Utilize o botão acima para registrar movimentações adicionais.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categorias">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card className="border-border/60">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Categorias personalizadas</CardTitle>
                      <CardDescription>
                        Estruture o orçamento com categorias e percentuais adaptados à sua realidade.
                      </CardDescription>
                    </div>
                    <Button className="bg-primary px-5 text-primary-foreground hover:bg-primary/90" onClick={() => handleOpenCategoriaDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova categoria
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingCategorias ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="border-border/50 bg-muted/30 p-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="mt-2 h-3 w-full" />
                        </Card>
                      ))
                    ) : categorias && categorias.length > 0 ? (
                      categorias.map(categoria => (
                        <div
                          key={categoria.id}
                          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold">{categoria.nome}</p>
                            <p className="text-xs text-muted-foreground">Tipo: {categoria.tipo}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>Percentual alvo:</span>
                            <span className="font-semibold text-foreground">
                              {formatPercent(categoria.percentual ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenCategoriaDialog(categoria)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => setCategoriaToDelete(categoria)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                        Nenhuma categoria criada ainda. Comece adicionando categorias para distribuir automaticamente o caixa operacional.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Regras automatizadas</CardTitle>
                    <CardDescription>
                      Defina condições → ações para orientações financeiras dinâmicas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                      <p className="font-semibold text-foreground">Exemplo de regra:</p>
                      <pre className="mt-2 rounded-md bg-background/80 p-3 text-xs text-muted-foreground">
                        {`{
  "condicao": "lucro_diario < meta_diaria",
  "acao": "enviar_alerta('Meta diária não atingida!')"
}`}
                      </pre>
                      <p className="mt-2 text-xs">
                        Configure regras personalizadas no backend para que o sistema reaja
                        automaticamente às suas metas e resultados.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="layout">
              <Card className="border-border/60">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Personalização do painel</CardTitle>
                    <CardDescription>
                      Arraste, solte e configure widgets para criar um painel único por usuário.
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => setLayoutDialogOpen(true)}>
                    <Layout className="h-4 w-4" />
                    Abrir editor de widgets
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground">
                  <p>
                    Esse módulo suporta a criação de layouts individuais salvos em <code>gestor_configuracoes.layout</code>,
                    permitindo escolher a posição dos widgets, cores, temas e preferências pessoais.
                  </p>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>Use drag & drop para reorganizar cards e gráficos.</li>
                    <li>Salve combinações de layouts para diferentes estratégias (ex.: agressiva, conservadora).</li>
                    <li>Compartilhe presets com outros usuários da equipe.</li>
                  </ul>
                  <p>
                    A implementação de drag & drop pode ser feita com <strong>React Grid Layout</strong>, mantendo
                    a persistência no banco via API de configurações. Este é o próximo passo após a integração dos dados.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <Dialog open={transacaoDialogOpen} onOpenChange={setTransacaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{transacaoToEdit ? 'Editar transação' : 'Nova transação'}</DialogTitle>
            <DialogDescription>
              Registre entradas (receitas) ou saídas (despesas) pessoais para complementar o cálculo do caixa.
            </DialogDescription>
          </DialogHeader>
          <Form {...transacaoForm}>
            <form className="space-y-4" onSubmit={transacaoForm.handleSubmit(onSubmitTransacao)}>
              <FormField
                control={transacaoForm.control}
                name="descricao"
                rules={{ required: 'Informe uma descrição' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Compra de equipamentos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={transacaoForm.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="receita">Receita</SelectItem>
                          <SelectItem value="despesa">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={transacaoForm.control}
                  name="valor"
                  rules={{ required: 'Informe o valor', min: { value: 0, message: 'Valor inválido' } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={transacaoForm.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Sem categoria</SelectItem>
                          {(categorias ?? []).map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={transacaoForm.control}
                  name="data"
                  rules={{ required: 'Informe a data' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTransacaoDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingTransacao || updatingTransacao}>
                  {(creatingTransacao || updatingTransacao) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{categoriaToEdit ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
            <DialogDescription>
              Personalize a forma como o caixa será distribuído entre metas, aportes, gastos e investimentos.
            </DialogDescription>
          </DialogHeader>
          <Form {...categoriaForm}>
            <form className="space-y-4" onSubmit={categoriaForm.handleSubmit(onSubmitCategoria)}>
              <FormField
                control={categoriaForm.control}
                name="nome"
                rules={{ required: 'Informe o nome da categoria' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Reserva de emergência" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={categoriaForm.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gasto">Gasto pessoal</SelectItem>
                          <SelectItem value="investimento">Investimento</SelectItem>
                          <SelectItem value="aporte">Aporte de caixa</SelectItem>
                          <SelectItem value="reserva">Reserva</SelectItem>
                          <SelectItem value="personalizado">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoriaForm.control}
                  name="percentual"
                  rules={{ min: { value: 0, message: 'Valor inválido' } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentual alvo (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCategoriaDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingCategoria || updatingCategoria}>
                  {(creatingCategoria || updatingCategoria) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={percentualDialogOpen} onOpenChange={setPercentualDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajustar percentuais de distribuição</DialogTitle>
            <DialogDescription>
              Informe como o capital será distribuído automaticamente entre as categorias configuradas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!categorias?.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria disponível. Crie categorias antes de ajustar os percentuais.
              </p>
            ) : (
              categorias.map(categoria => (
                <div key={categoria.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{categoria.nome}</p>
                    <p className="text-xs text-muted-foreground capitalize">Tipo: {categoria.tipo}</p>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={percentualDrafts[categoria.id] ?? categoria.percentual ?? 0}
                      onChange={event =>
                        setPercentualDrafts(prev => ({
                          ...prev,
                          [categoria.id]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPercentualDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmitPercentuais} disabled={updatingCategoria || !categorias?.length}>
              {updatingCategoria && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={layoutDialogOpen} onOpenChange={setLayoutDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Personalização do painel</DialogTitle>
            <DialogDescription>
              Configure widgets, cores e disposição do painel para criar uma experiência exclusiva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Esta funcionalidade permite salvar layouts individuais por usuário usando drag & drop baseado em
              <strong> React Grid Layout</strong>. Você poderá posicionar cartões, gráficos e indicadores conforme sua necessidade.
            </p>
            <p>
              Enquanto o construtor visual não é disponibilizado, utilize este painel para definir preferências iniciais ou
              registrar sugestões para a equipe.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setLayoutDialogOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transacaoToDelete} onOpenChange={open => !open && setTransacaoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Tem certeza que deseja remover esta transação pessoal?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteTransacao}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!categoriaToDelete} onOpenChange={open => !open && setCategoriaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Categorias removidas deixam de aparecer na distribuição e nas transações futuras. Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteCategoria}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default GestorCaixa;

