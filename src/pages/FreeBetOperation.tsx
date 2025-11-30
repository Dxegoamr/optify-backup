import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, CheckCircle2, Gift, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees } from '@/hooks/useFirestore';
import { FreeBetService } from '@/core/services/freebet.service';
import { UserDailySummaryService, UserTransactionService } from '@/core/services/user-specific.service';
import { FreeBetOperation, FreeBetEmployee } from '@/types/freebet';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentDateStringInSaoPaulo } from '@/utils/timezone';

const FreeBetOperation = () => {
  const { operationId } = useParams<{ operationId: string }>();
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const queryClient = useQueryClient();

  // Buscar operação
  const { data: operation, isLoading } = useQuery({
    queryKey: ['freebet-operation', user?.uid, operationId],
    queryFn: () => FreeBetService.getOperation(user?.uid || '', operationId || ''),
    enabled: !!user?.uid && !!operationId,
  });

  // Buscar funcionários
  const { data: allEmployees = [] } = useEmployees(user?.uid || '');

  const [funcionarios, setFuncionarios] = useState<FreeBetEmployee[]>([]);
  const [valorFreeBet, setValorFreeBet] = useState(0);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const hasInitializedRef = useRef(false);
  const lastOperationIdRef = useRef<string | null>(null);

  // Resetar inicialização quando trocamos de operação
  useEffect(() => {
    hasInitializedRef.current = false;
    lastOperationIdRef.current = null;
  }, [operationId]);

  // Carregar dados da operação apenas na primeira inicialização (ou quando trocar de operação)
  useEffect(() => {
    if (!operation) return;

    const shouldInitialize =
      !hasInitializedRef.current || lastOperationIdRef.current !== operation.id;

    if (!shouldInitialize) {
      return;
    }

    hasInitializedRef.current = true;
    lastOperationIdRef.current = operation.id;

    setFuncionarios(operation.funcionarios || []);
    setValorFreeBet(operation.valorFreeBet || 0);
  }, [operation, operationId]);

  // Funcionários com freebet (não vencedores + vencedores que também recebem freebet)
  const funcionariosComFreebet = useMemo(() => {
    return funcionarios.filter(
      f => !f.vencedor || (f.vencedor && f.vencedorRecebeFreebet === true)
    );
  }, [funcionarios]);

  // Calcular totais
  const calculos = useMemo(() => {
    const totalApostado = funcionarios.reduce((sum, f) => sum + (f.valorApostado || 0), 0);
    const contaVencedora = funcionarios.find(f => f.vencedor);
    const retorno = contaVencedora?.retorno || 0;
    const perdaFreeBet = totalApostado - retorno;
    // Calcular total de freebets usando a lista já filtrada
    const totalFreeBets = funcionariosComFreebet.length * valorFreeBet;
    
    // Calcular conversões das freebets
    const totalConversaoSaldo = funcionariosComFreebet.reduce(
      (sum, f) => sum + (f.conversaoSaldo || 0),
      0
    );
    
    // Lucro geral = (Retorno da conta vencedora + Total de conversões) - Total apostado
    const lucroGeral = (retorno + totalConversaoSaldo) - totalApostado;

    return {
      totalApostado,
      retorno,
      perdaFreeBet,
      totalFreeBets,
      totalConversaoSaldo,
      lucroGeral,
    };
  }, [funcionarios, valorFreeBet, funcionariosComFreebet]);

  // Salvar operação
  const saveOperation = useCallback(async () => {
    if (!user?.uid || !operationId) return;

    try {
      await FreeBetService.updateOperation(user.uid, operationId, {
        funcionarios,
        valorFreeBet,
      });
      queryClient.invalidateQueries({ queryKey: ['freebet-operation', user.uid, operationId] });
      queryClient.invalidateQueries({ queryKey: ['freebet-operations', user.uid] });
    } catch (error) {
      console.error('Erro ao salvar operação:', error);
    }
  }, [user?.uid, operationId, funcionarios, valorFreeBet, queryClient]);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Adicionar funcionários
  const handleAddEmployees = async () => {
    const newEmployees: FreeBetEmployee[] = selectedEmployees
      .filter(id => !funcionarios.find(f => f.id === id))
      .map(id => {
        const emp = allEmployees.find(e => e.id === id);
        return {
          id: emp?.id || id,
          nome: emp?.name || emp?.nome || 'Funcionário',
          valorApostado: 0,
          vencedor: false,
        };
      });

    const updatedFuncionarios = [...funcionarios, ...newEmployees];
    setFuncionarios(updatedFuncionarios);
    setSelectedEmployees([]);
    setAddEmployeeModalOpen(false);
    
    // Salvar após adicionar
    if (!user?.uid || !operationId) return;
    try {
      await FreeBetService.updateOperation(user.uid, operationId, {
        funcionarios: updatedFuncionarios,
        valorFreeBet,
      });
      queryClient.invalidateQueries({ queryKey: ['freebet-operation', user.uid, operationId] });
      queryClient.invalidateQueries({ queryKey: ['freebet-operations', user.uid] });
      toast.success('Funcionários adicionados!');
    } catch (error) {
      toast.error('Erro ao adicionar funcionários');
      console.error(error);
    }
  };

  // Atualizar funcionário
  const updateFuncionario = (id: string, updates: Partial<FreeBetEmployee>) => {
    const updated = funcionarios.map(f => {
      if (f.id === id) {
        const updatedFunc = { ...f, ...updates };
        return updatedFunc;
      }
      // Desmarcar outros se este foi marcado como vencedor
      if (updates.vencedor && updates.vencedor === true) {
        return { ...f, vencedor: false };
      }
      return f;
    });
    setFuncionarios(updated);
  };

  // Remover funcionário
  const removeFuncionario = (id: string) => {
    setFuncionarios(funcionarios.filter(f => f.id !== id));
  };

  // Fechar operação e salvar lucro no resumo do dia
  const handleCloseOperation = async () => {
    if (!user?.uid) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const currentDate = getCurrentDateStringInSaoPaulo();
      const lucro = calculos.lucroGeral;
      
      // Criar transação (depósito se lucro > 0, saque se < 0)
      let transactionId: string | undefined;
      if (lucro !== 0) {
        const transactionType = lucro > 0 ? 'deposit' : 'withdraw';
        const transactionAmount = Math.abs(lucro);
        
        transactionId = await UserTransactionService.createTransaction(user.uid, {
          employeeId: '',
          platformId: '',
          type: transactionType,
          amount: transactionAmount,
          description: `FreeBet ${operation?.platformName || 'Operação'}`,
          date: currentDate,
        });
      }

      // Atualizar resumo diário
      const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, currentDate);
      const depositContribution = lucro > 0 ? lucro : 0;
      const withdrawContribution = lucro < 0 ? Math.abs(lucro) : 0;
      if (existingSummary) {
        await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
          totalDeposits: (existingSummary.totalDeposits || 0) + depositContribution,
          totalWithdraws: (existingSummary.totalWithdraws || 0) + withdrawContribution,
          profit: (existingSummary.profit || existingSummary.margin || 0) + lucro,
          margin: (existingSummary.margin || existingSummary.profit || 0) + lucro,
          transactionCount: (existingSummary.transactionCount || 0) + 1,
          updatedAt: new Date(),
        });
      } else {
        await UserDailySummaryService.createDailySummary(user.uid, {
          date: currentDate,
          totalDeposits: depositContribution,
          totalWithdraws: withdrawContribution,
          profit: lucro,
          margin: lucro,
          transactionCount: 1,
          transactionsSnapshot: [],
          byEmployee: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Invalidar queries para atualizar o resumo do dia e transações
      queryClient.invalidateQueries({ queryKey: ['firebase-all-daily-summaries', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['firebase-daily-summaries', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['firebase-transactions', user.uid] });
      
      // Salvar histórico da operação
      if (operationId && operation) {
        await FreeBetService.addHistoryEntry(user.uid, {
          operationId,
          platformName: operation.platformName,
          platformColor: operation.platformColor,
          funcionarios,
          valorFreeBet,
          totalApostado: calculos.totalApostado,
          retorno: calculos.retorno,
          totalConversaoSaldo: calculos.totalConversaoSaldo,
          lucro,
          transactionId,
          closedAt: new Date(),
        });
      }

      // Limpar dados da operação para nova utilização
      if (operationId) {
        await FreeBetService.updateOperation(user.uid, operationId, {
          funcionarios: [],
          valorFreeBet: 0,
        });
        
        // Invalidar queries das operações
        queryClient.invalidateQueries({ queryKey: ['freebet-operations', user.uid] });
        queryClient.invalidateQueries({ queryKey: ['freebet-operation', user.uid, operationId] });
        queryClient.invalidateQueries({ queryKey: ['freebet-history', user.uid] });
      }

      // Atualizar estado local
      setFuncionarios([]);
      setValorFreeBet(0);
      
      toast.success(
        lucro > 0
          ? `Depósito de R$ ${lucro.toFixed(2)} registrado com sucesso!`
          : `Saque de R$ ${Math.abs(lucro).toFixed(2)} registrado com sucesso!`
      );
      
      // Redirecionar de volta para a página de FreeBet (card permanece mas limpo)
      navigate('/freebet');
    } catch (error) {
      console.error('Erro ao fechar operação:', error);
      toast.error('Erro ao fechar operação. Tente novamente.');
    }
  };

  // Salvar automaticamente com debounce
  useEffect(() => {
    if (operation && funcionarios.length > 0) {
      // Limpar timeout anterior
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Criar novo timeout
      saveTimeoutRef.current = setTimeout(() => {
        saveOperation();
      }, 1500); // Debounce de 1.5 segundos

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [funcionarios, valorFreeBet, operation, saveOperation]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!operation) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Operação não encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/freebet')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Operação {operation.platformName}</h1>
              <p className="text-muted-foreground">Gerencie sua operação FreeBet</p>
            </div>
          </div>
          <Button onClick={() => setAddEmployeeModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Funcionários
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Painel Esquerdo - Funcionários */}
          <Card>
            <CardHeader>
              <CardTitle>Funcionários e Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {funcionarios.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Nenhum funcionário adicionado ainda
                </p>
              ) : (
                funcionarios.map((func, index) => (
                  <div
                    key={func.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{func.nome}</Label>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                      <div className="flex-1">
                        <Label htmlFor={`valor-${func.id}`} className="text-xs">
                          Valor Apostado
                        </Label>
                        <Input
                          id={`valor-${func.id}`}
                          type="number"
                          step="0.01"
                          value={func.valorApostado || ''}
                          onChange={e =>
                            updateFuncionario(func.id, {
                              valorApostado: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`vencedor-${func.id}`}
                          checked={func.vencedor || false}
                          onCheckedChange={checked =>
                            updateFuncionario(func.id, { vencedor: checked === true })
                          }
                        />
                        <Label htmlFor={`vencedor-${func.id}`} className="text-xs">
                          Vencedora
                        </Label>
                      </div>
                      {func.vencedor && (
                        <div className="flex flex-1 flex-col gap-2">
                          <div>
                            <Label htmlFor={`retorno-${func.id}`} className="text-xs">
                              Valor Retorno
                            </Label>
                            <Input
                              id={`retorno-${func.id}`}
                              type="number"
                              step="0.01"
                              value={func.retorno || ''}
                              onChange={e =>
                                updateFuncionario(func.id, {
                                  retorno: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`vencedor-freebet-${func.id}`}
                              checked={func.vencedorRecebeFreebet || false}
                              onCheckedChange={checked =>
                                updateFuncionario(func.id, {
                                  vencedorRecebeFreebet: checked === true,
                                })
                              }
                            />
                            <Label
                              htmlFor={`vencedor-freebet-${func.id}`}
                              className="text-xs cursor-pointer"
                            >
                              Também recebe FreeBet
                            </Label>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFuncionario(func.id)}
                      >
                        <span className="text-red-500">×</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Painel Direito - Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo dos Cálculos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="valor-freebet">Valor da FreeBet</Label>
                <Input
                  id="valor-freebet"
                  type="number"
                  step="0.01"
                  value={valorFreeBet || ''}
                  onChange={e => {
                    setValorFreeBet(parseFloat(e.target.value) || 0);
                  }}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Apostado:</span>
                  <span className="font-semibold">R$ {calculos.totalApostado.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Conta Vencedora (retorno):</span>
                  <span className="font-semibold">
                    {calculos.retorno > 0 ? `R$ ${calculos.retorno.toFixed(2)}` : '-'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Perda p/ FreeBet:</span>
                  <span
                    className={`font-semibold ${
                      calculos.perdaFreeBet >= 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    R$ {calculos.perdaFreeBet.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total em FreeBets:</span>
                  <span className="font-semibold">R$ {calculos.totalFreeBets.toFixed(2)}</span>
                </div>

                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-muted-foreground">Total Conversão Saldo:</span>
                  <span className="font-semibold">
                    R$ {calculos.totalConversaoSaldo.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Lucro Geral:</span>
                  <span
                    className={`font-bold text-lg ${
                      calculos.lucroGeral >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {calculos.lucroGeral >= 0 ? '+' : ''}R$ {calculos.lucroGeral.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botão Fechar Operação */}
              <Button
                onClick={handleCloseOperation}
                className="w-full mt-4"
                variant="default"
                size="lg"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Fechar Operação
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Conversão das FreeBets */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle>Conversão das FreeBets</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerencie as freebets e registre as conversões em saldo. A conta vencedora também pode receber freebet se marcada.
            </p>
          </CardHeader>
          <CardContent>
            {funcionariosComFreebet.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma conta com freebet. Marque uma conta como vencedora para que as outras recebam freebet, ou marque a vencedora para também receber freebet.
              </p>
            ) : (
              <div className="space-y-4">
                {funcionariosComFreebet.map((func) => (
                  <div
                    key={func.id}
                    className={`flex flex-col gap-4 rounded-lg border p-4 transition-all sm:flex-row sm:items-center ${
                      func.freebetUsada
                        ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            func.freebetUsada
                              ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <span className="font-semibold">{func.nome.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{func.nome}</p>
                            {func.vencedor && (
                              <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                                Vencedora
                              </span>
                            )}
                            {func.freebetUsada && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            FreeBet: R$ {valorFreeBet.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`freebet-usada-${func.id}`}
                          checked={func.freebetUsada || false}
                          onCheckedChange={checked =>
                            updateFuncionario(func.id, { freebetUsada: checked === true })
                          }
                        />
                        <Label
                          htmlFor={`freebet-usada-${func.id}`}
                          className="text-sm cursor-pointer"
                        >
                          Freebet Usada
                        </Label>
                      </div>

                      <div className="flex-1">
                        <Label
                          htmlFor={`conversao-${func.id}`}
                          className="text-xs text-muted-foreground flex items-center gap-1"
                        >
                          <DollarSign className="h-3 w-3" />
                          Conversão em Saldo (R$)
                        </Label>
                        <div className="relative">
                          <Input
                            id={`conversao-${func.id}`}
                            type="number"
                            step="0.01"
                            value={func.conversaoSaldo || ''}
                            onChange={e =>
                              updateFuncionario(func.id, {
                                conversaoSaldo: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                            className={
                              func.conversaoSaldo && func.conversaoSaldo > 0
                                ? 'border-green-500 focus:border-green-600'
                                : ''
                            }
                          />
                          {func.conversaoSaldo && func.conversaoSaldo > 0 && (
                            <TrendingUp className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Resumo da Conversão */}
                {funcionariosComFreebet.length > 0 && (
                  <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total FreeBets</p>
                        <p className="text-lg font-semibold">
                          {funcionariosComFreebet.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">FreeBets Usadas</p>
                        <p className="text-lg font-semibold">
                          {funcionariosComFreebet.filter(f => f.freebetUsada).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Convertido</p>
                        <p className="text-lg font-semibold text-green-600">
                          R$ {calculos.totalConversaoSaldo.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pendente</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {funcionariosComFreebet.filter(f => !f.freebetUsada).length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Adicionar Funcionários */}
      <Dialog open={addEmployeeModalOpen} onOpenChange={setAddEmployeeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Funcionários</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {allEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Nenhum funcionário cadastrado
              </p>
            ) : (
              allEmployees.map(emp => {
                const isSelected = selectedEmployees.includes(emp.id);
                const alreadyAdded = funcionarios.find(f => f.id === emp.id);

                return (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={isSelected}
                      disabled={!!alreadyAdded}
                      onCheckedChange={checked => {
                        if (checked) {
                          setSelectedEmployees([...selectedEmployees, emp.id]);
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`emp-${emp.id}`}
                      className={`flex-1 cursor-pointer ${alreadyAdded ? 'text-muted-foreground' : ''}`}
                    >
                      {emp.name}
                    </Label>
                    {alreadyAdded && (
                      <span className="text-xs text-muted-foreground">Já adicionado</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmployeeModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEmployees} disabled={selectedEmployees.length === 0}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FreeBetOperation;

