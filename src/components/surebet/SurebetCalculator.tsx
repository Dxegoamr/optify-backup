import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { RotateCcw, Search, X, Check, ChevronsUpDown } from 'lucide-react';
import { usePlatforms } from '@/hooks/useFirestore';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { SurebetCalculator as SurebetCalculatorType } from '@/types/surebet';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

// Funções para formatação de odds (EXATAMENTE igual Dutching)
const sanitizeDigits = (value: string) => value.replace(/\D/g, '');

// Formatação de odds: 2 casas decimais após o ponto (igual Dutching)
const formatOddToDisplay = (digits: string) => {
  if (!digits) return '';
  if (digits.length <= 2) {
    // 1 dígito: "2" -> "2"
    // 2 dígitos: "20" -> "20"
    return digits;
  }
  // Para 3+ dígitos: últimos 2 são decimais
  // Ex: "207" -> "2.07", "2071" -> "20.71", "1446" -> "14.46"
  const integerPart = digits.slice(0, digits.length - 2);
  const decimalPart = digits.slice(-2);
  return `${integerPart}.${decimalPart}`;
};

const parseOddToNumber = (digits: string) => {
  if (!digits) return 0;
  const formatted = formatOddToDisplay(digits);
  return parseFloat(formatted) || 0;
};

interface SurebetCalculatorProps {
  onCalculate?: (calculator: SurebetCalculatorType) => void;
  onSpreadsheet?: (calculator: SurebetCalculatorType) => void;
}

export const SurebetCalculator = ({ onCalculate, onSpreadsheet }: SurebetCalculatorProps) => {
  const { user } = useFirebaseAuth();
  const { data: platforms = [] } = usePlatforms(user?.uid || '');
  const queryClient = useQueryClient();

  // Filtrar apenas plataformas ativas
  const activePlatforms = useMemo(() => {
    return platforms.filter((p: any) => p.isActive !== false);
  }, [platforms]);

  const [house1, setHouse1] = useState({
    name: '',
    color: '#808080',
    odd: 0,
    oddDigits: '',
    stake: 0,
    profit: 0
  });

  const [house2, setHouse2] = useState({
    name: '',
    color: '#808080',
    odd: 0,
    oddDigits: '',
    stake: 0,
    profit: 0
  });

  // Converter dígitos de odds para números
  useEffect(() => {
    const numericOdd1 = parseOddToNumber(house1.oddDigits);
    setHouse1(prev => ({ ...prev, odd: numericOdd1 }));
  }, [house1.oddDigits]);

  useEffect(() => {
    const numericOdd2 = parseOddToNumber(house2.oddDigits);
    setHouse2(prev => ({ ...prev, odd: numericOdd2 }));
  }, [house2.oddDigits]);

  // Calcular lucros e margem automaticamente
  const calculations = useMemo(() => {
    const odd1 = house1.odd || 0;
    const odd2 = house2.odd || 0;
    const stake1 = house1.stake || 0;
    const stake2 = house2.stake || 0;
    
    // Total investido (soma dos stakes)
    const totalInvested = stake1 + stake2;

    // Se não temos odds e stakes válidos, retornar zeros
    if (odd1 <= 0 || odd2 <= 0 || totalInvested <= 0) {
      return {
        profit1: 0,
        profit2: 0,
        totalInvested: 0,
        totalProfit: 0,
        margin: 0,
        returnAmount: 0
      };
    }

    // 1. Calcular a soma das inversas das odds
    const sumInverses = (1 / odd1) + (1 / odd2);

    // 2. Calcular as stakes proporcionais ideais (mantendo o total fixo)
    // stake_i = (total / S) * (1 / odd_i)
    const idealStake1 = (totalInvested / sumInverses) * (1 / odd1);
    const idealStake2 = (totalInvested / sumInverses) * (1 / odd2);

    // 3. Calcular o retorno bruto garantido (deve ser igual usando qualquer stake)
    // Retorno = stake1 * odd1 = stake2 * odd2 (quando stakes são proporcionais)
    // Mas como o usuário pode ter colocado stakes manuais, usamos os valores reais
    // O retorno garantido é o menor entre os dois retornos possíveis
    const return1 = idealStake1 * odd1;
    const return2 = idealStake2 * odd2;
    // Para uma surebet perfeita, ambos devem ser iguais, mas usamos o menor para garantir
    const returnAmount = Math.min(return1, return2);

    // 4. Calcular o lucro líquido
    // Lucro = retorno - total investido
    const totalProfit = returnAmount - totalInvested;

    // 5. Calcular a porcentagem de lucro
    // lucro_percentual = (lucro / total) * 100
    const margin = totalInvested > 0 
      ? (totalProfit / totalInvested) * 100 
      : 0;

    // Lucro individual de cada casa (para exibição)
    // Baseado nos stakes ideais
    const profit1 = returnAmount - totalInvested; // Lucro é o mesmo para ambos
    const profit2 = returnAmount - totalInvested; // Lucro é o mesmo para ambos

    return {
      profit1,
      profit2,
      totalInvested,
      totalProfit,
      margin,
      returnAmount,
      idealStake1,
      idealStake2
    };
  }, [house1.odd, house1.stake, house2.odd, house2.stake]);

  // Atualizar lucros quando cálculos mudarem
  // Na surebet, ambos os lucros são iguais (retorno garantido - total)
  useEffect(() => {
    const profit = calculations.totalProfit;
    setHouse1(prev => ({ ...prev, profit }));
    setHouse2(prev => ({ ...prev, profit }));
  }, [calculations.totalProfit]);

  // Notificar cálculo quando mudar
  useEffect(() => {
    if (onCalculate) {
      const calculatorData: SurebetCalculatorType = {
        house1: {
          name: house1.name,
          color: house1.color,
          odd: house1.odd,
          stake: house1.stake,
          profit: calculations.profit1
        },
        house2: {
          name: house2.name,
          color: house2.color,
          odd: house2.odd,
          stake: house2.stake,
          profit: calculations.profit2
        },
        total: calculations.totalInvested,
        margin: calculations.margin,
        isSurebet: calculations.margin > 0
      };
      onCalculate(calculatorData);
    }
  }, [house1, house2, calculations, onCalculate]);

  const handleOddChange = (house: 'house1' | 'house2', inputValue: string) => {
    const digits = sanitizeDigits(inputValue);
    if (house === 'house1') {
      setHouse1(prev => ({ ...prev, oddDigits: digits }));
    } else {
      setHouse2(prev => ({ ...prev, oddDigits: digits }));
    }
  };

  const [house1StakeInput, setHouse1StakeInput] = useState('');
  const [house2StakeInput, setHouse2StakeInput] = useState('');
  
  // Estados para busca de casas de aposta (usando Popover com Command)
  const [house1PopoverOpen, setHouse1PopoverOpen] = useState(false);
  const [house2PopoverOpen, setHouse2PopoverOpen] = useState(false);

  const handleStakeChange = (house: 'house1' | 'house2', inputValue: string) => {
    // Remove tudo exceto números, vírgula e ponto
    let value = inputValue.replace(/[^\d.,]/g, '');
    
    // Substitui vírgula por ponto para parseFloat
    value = value.replace(',', '.');
    
    // Remove múltiplos pontos
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    const stake = parseFloat(value) || 0;
    
    if (house === 'house1') {
      setHouse1StakeInput(inputValue);
      setHouse1(prev => ({ ...prev, stake }));
    } else {
      setHouse2StakeInput(inputValue);
      setHouse2(prev => ({ ...prev, stake }));
    }
  };

  const handleHouseChange = (house: 'house1' | 'house2', platformId: string) => {
    const selectedPlatform = activePlatforms.find((p: any) => p.id === platformId);
    if (selectedPlatform) {
      if (house === 'house1') {
        setHouse1(prev => ({
          ...prev,
          name: selectedPlatform.name,
          color: selectedPlatform.color || '#808080'
        }));
      } else {
        setHouse2(prev => ({
          ...prev,
          name: selectedPlatform.name,
          color: selectedPlatform.color || '#808080'
        }));
      }
    }
  };

  const handleReset = (house: 'house1' | 'house2' | 'all') => {
    if (house === 'house1') {
      setHouse1({
        name: '',
        color: '#808080',
        odd: 0,
        oddDigits: '',
        stake: 0,
        profit: 0
      });
      setHouse1StakeInput('');
    } else if (house === 'house2') {
      setHouse2({
        name: '',
        color: '#808080',
        odd: 0,
        oddDigits: '',
        stake: 0,
        profit: 0
      });
      setHouse2StakeInput('');
    } else {
      setHouse1({
        name: '',
        color: '#808080',
        odd: 0,
        oddDigits: '',
        stake: 0,
        profit: 0
      });
      setHouse2({
        name: '',
        color: '#808080',
        odd: 0,
        oddDigits: '',
        stake: 0,
        profit: 0
      });
      setHouse1StakeInput('');
      setHouse2StakeInput('');
    }
  };

  const handleSpreadsheet = async () => {
    if (onSpreadsheet && calculations.margin > 0 && user?.uid) {
      const calculatorData: SurebetCalculatorType = {
        house1: {
          name: house1.name,
          color: house1.color,
          odd: house1.odd,
          stake: house1.stake,
          profit: calculations.profit1
        },
        house2: {
          name: house2.name,
          color: house2.color,
          odd: house2.odd,
          stake: house2.stake,
          profit: calculations.profit2
        },
        total: calculations.totalInvested,
        margin: calculations.margin,
        isSurebet: true
      };

      // Criar registros na planilha e transação
      try {
        const { SurebetService } = await import('@/core/services/surebet.service');
        const { UserTransactionService } = await import('@/core/services/user-specific.service');
        const { UserDailySummaryService } = await import('@/core/services/user-specific.service');
        const { getCurrentDateStringInSaoPaulo } = await import('@/utils/timezone');
        const { toast } = await import('sonner');

        const operationId = `op-${Date.now()}`;
        const registrationDate = new Date();
        const currentDate = getCurrentDateStringInSaoPaulo();
        const lucroTotal = calculations.totalProfit; // Lucro total da operação

        // Criar transação apenas se houver lucro
        let transactionId: string | undefined;
        if (lucroTotal > 0) {
          transactionId = await UserTransactionService.createTransaction(user.uid, {
            employeeId: '',
            platformId: '',
            type: 'deposit',
            amount: lucroTotal,
            description: `Surebet - ${house1.name} vs ${house2.name}`,
            date: currentDate,
          });

          // Atualizar resumo diário
          const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, currentDate);
          if (existingSummary) {
            await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
              totalDeposits: (existingSummary.totalDeposits || 0) + lucroTotal,
              profit: (existingSummary.profit || existingSummary.margin || 0) + lucroTotal,
              margin: (existingSummary.margin || existingSummary.profit || 0) + lucroTotal,
              transactionCount: (existingSummary.transactionCount || 0) + 1,
              updatedAt: new Date(),
            });
          } else {
            await UserDailySummaryService.createDailySummary(user.uid, {
              date: currentDate,
              totalDeposits: lucroTotal,
              totalWithdraws: 0,
              profit: lucroTotal,
              margin: lucroTotal,
              transactionCount: 1,
              transactionsSnapshot: [],
              byEmployee: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // Criar dois registros (um para cada casa)
        // Remover campos undefined pois o Firestore não aceita
        const record1: any = {
          userId: user.uid,
          operationId,
          transactionId: transactionId || null, // Armazenar transactionId no primeiro registro
          registrationDate,
          house: house1.name,
          odd: house1.odd,
          stake: house1.stake,
          profit: calculations.profit1,
          evPercent: calculations.margin,
          total: calculations.totalInvested,
          sport: '',
          market: '',
          event: ''
          // status não é incluído se for undefined
        };

        const record2: any = {
          userId: user.uid,
          operationId,
          registrationDate,
          house: house2.name,
          odd: house2.odd,
          stake: house2.stake,
          profit: calculations.profit2,
          evPercent: calculations.margin,
          total: calculations.totalInvested,
          sport: '',
          market: '',
          event: ''
          // status não é incluído se for undefined
        };

        await SurebetService.createRecord(user.uid, record1);
        await SurebetService.createRecord(user.uid, record2);

        // Invalidar queries para atualizar a planilha
        queryClient.invalidateQueries({ queryKey: ['surebet-records', user.uid] });
        queryClient.invalidateQueries({ queryKey: ['transactions', user.uid] });
        queryClient.invalidateQueries({ queryKey: ['daily-summaries', user.uid] });

        toast.success('Operação adicionada à planilha!');
        onSpreadsheet(calculatorData);
      } catch (error) {
        console.error('Erro ao criar registros e transação:', error);
        const { toast } = await import('sonner');
        toast.error('Erro ao adicionar operação à planilha');
      }
    }
  };

  if (activePlatforms.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        Nenhuma casa de aposta disponível. Crie casas de aposta na aba "Saldos" para usar a calculadora.
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-background via-background/95 to-background/90 border-border/40 shadow-xl relative overflow-hidden">
      {/* Efeito neon sutil no fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none opacity-50" />
      <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      
      <div className="space-y-4 relative z-10">
        {/* Cabeçalho da Tabela */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 items-center text-sm font-semibold text-muted-foreground border-b border-border/50 pb-3">
          <div className="w-8"></div> {/* Espaço para botão reset */}
          <div className="text-left">Casa:</div>
          <div className="text-center">Odd:</div>
          <div className="text-center">Stake:</div>
          <div className="text-right">Lucro:</div>
        </div>

        {/* Linha 1 - Casa 1 */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 items-center p-3 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 hover:bg-card/70 transition-all duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleReset('house1')}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Popover open={house1PopoverOpen} onOpenChange={setHouse1PopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={house1PopoverOpen}
                className="h-9 text-white font-medium border-0 shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] justify-between min-w-[140px]"
                style={{ backgroundColor: house1.name ? house1.color : '#808080' }}
              >
                {house1.name || "Selecione a casa"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar casa..." />
                <CommandList>
                  <CommandEmpty>Nenhuma casa encontrada.</CommandEmpty>
                  <CommandGroup>
                    {activePlatforms.map((platform: any) => (
                      <CommandItem
                        key={platform.id}
                        value={platform.name}
                        onSelect={() => {
                          handleHouseChange('house1', platform.id);
                          setHouse1PopoverOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            house1.name === platform.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded flex-shrink-0"
                            style={{ backgroundColor: platform.color || '#808080' }}
                          />
                          {platform.name}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Input
            type="text"
            inputMode="decimal"
            value={formatOddToDisplay(house1.oddDigits)}
            onChange={(e) => handleOddChange('house1', e.target.value)}
            className="text-center border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
            placeholder="Ex: 2.20"
          />

          <Input
            type="text"
            inputMode="decimal"
            value={house1StakeInput}
            onChange={(e) => handleStakeChange('house1', e.target.value)}
            className="text-center border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
            placeholder="0,00"
          />

          <div className="text-right font-bold text-emerald-400 text-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
            R$ {calculations.profit1.toFixed(2)}
          </div>
        </div>

        {/* Linha 2 - Casa 2 */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 items-center p-3 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 hover:bg-card/70 transition-all duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleReset('house2')}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Popover open={house2PopoverOpen} onOpenChange={setHouse2PopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={house2PopoverOpen}
                className="h-9 text-white font-medium border-0 shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] justify-between min-w-[140px]"
                style={{ backgroundColor: house2.name ? house2.color : '#808080' }}
              >
                {house2.name || "Selecione a casa"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar casa..." />
                <CommandList>
                  <CommandEmpty>Nenhuma casa encontrada.</CommandEmpty>
                  <CommandGroup>
                    {activePlatforms.map((platform: any) => (
                      <CommandItem
                        key={platform.id}
                        value={platform.name}
                        onSelect={() => {
                          handleHouseChange('house2', platform.id);
                          setHouse2PopoverOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            house2.name === platform.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded flex-shrink-0"
                            style={{ backgroundColor: platform.color || '#808080' }}
                          />
                          {platform.name}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Input
            type="text"
            inputMode="decimal"
            value={formatOddToDisplay(house2.oddDigits)}
            onChange={(e) => handleOddChange('house2', e.target.value)}
            className="text-center border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
            placeholder="Ex: 2.20"
          />

          <Input
            type="text"
            inputMode="decimal"
            value={house2StakeInput}
            onChange={(e) => handleStakeChange('house2', e.target.value)}
            className="text-center border-border/50 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
            placeholder="0,00"
          />

          <div className="text-right font-bold text-emerald-400 text-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
            R$ {calculations.profit2.toFixed(2)}
          </div>
        </div>

        {/* Linha Final - Resumo */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-4 items-center pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleReset('all')}
            className="h-9 w-9 rounded-full border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/60 hover:text-primary transition-all hover:scale-110"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div className="px-4 py-2.5 rounded-lg bg-muted/80 font-medium text-center border border-border/30 text-sm">
            Valor total apostado
          </div>

          <div className="text-center">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-bold text-lg">R$ {calculations.totalInvested.toFixed(2)}</span>
          </div>

          <div className="flex justify-end">
            <div
              className={`px-4 py-2.5 rounded-lg font-bold text-sm border transition-all ${
                calculations.margin > 0
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                  : 'bg-destructive/20 text-destructive border-destructive/30'
              }`}
            >
              {calculations.margin >= 0 ? '+' : ''}{calculations.margin.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Botão Planilhar */}
        <div className="pt-2">
          <Button
            onClick={handleSpreadsheet}
            className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={calculations.margin <= 0 || calculations.totalInvested === 0}
          >
            Planilhar
          </Button>
        </div>
      </div>
    </Card>
  );
};
