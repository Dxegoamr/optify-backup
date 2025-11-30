import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type DutchingRow = {
  id: number;
  odd: string;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const sanitizeNumberInput = (value: string) =>
  value.replace(/[^\d.,]/g, '').replace(/,/g, '.');

const sanitizeDigits = (value: string) => value.replace(/\D/g, '');

const formatDigitsToDisplay = (digits: string) => {
  if (!digits) return '';
  if (digits.length <= 2) {
    return digits;
  }
  const integerPart = digits.slice(0, digits.length - 2);
  const decimalPart = digits.slice(-2);
  return `${integerPart}.${decimalPart}`;
};

const parseDigitsToNumber = (digits: string) => {
  if (!digits) return 0;
  const formatted = formatDigitsToDisplay(digits);
  return Number.parseFloat(formatted);
};

interface DutchingCalculatorProps {
  variant?: 'page' | 'widget' | 'popup';
  className?: string;
  showBackdrop?: boolean;
  showLaunchButton?: boolean;
  showHero?: boolean;
}

export const DutchingCalculator = ({
  variant = 'page',
  className,
  showBackdrop = true,
  showLaunchButton = true,
  showHero = true,
}: DutchingCalculatorProps) => {
  const [rows, setRows] = useState<DutchingRow[]>([
    { id: 1, odd: '' },
    { id: 2, odd: '' },
    { id: 3, odd: '' },
  ]);
  const [investmentInput, setInvestmentInput] = useState('100');

  const isWidget = variant === 'widget';
  const isPageLike = !isWidget;

  const containerClasses = cn(
    'relative overflow-hidden',
    isWidget
      ? 'rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background/95 to-background/90 p-6 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.65)]'
      : showHero
        ? 'rounded-3xl border border-border/40 bg-gradient-to-br from-background via-background/95 to-background/80 px-6 py-10 shadow-[0_40px_120px_-45px_rgba(0,0,0,0.6)] sm:px-10 sm:py-12'
        : 'rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background/95 to-background/80 px-4 py-5 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.65)] sm:px-5 sm:py-6',
    className,
  );

  const overlayOpacity = isWidget ? 'opacity-40' : 'opacity-50';
  const contentSpacing = showHero ? (isWidget ? 'space-y-6' : 'space-y-8') : (isWidget ? 'space-y-4' : 'space-y-4');
  const headerSpacing = isWidget ? 'space-y-2' : 'space-y-3';
  const titleClass = isWidget ? 'text-xl font-bold text-white sm:text-2xl' : 'text-2xl font-bold text-white sm:text-3xl';
  const descriptionClass = isWidget
    ? 'max-w-lg text-xs text-white/70 sm:text-sm'
    : 'max-w-2xl text-sm text-white/70 sm:text-base';

  const investmentValue = useMemo(() => {
    const sanitized = sanitizeNumberInput(investmentInput);
    const parsed = parseFloat(sanitized);
    return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
  }, [investmentInput]);

  const calculation = useMemo(() => {
    const parsedOdds = rows
      .map(row => ({
        ...row,
        numericOdd: parseDigitsToNumber(row.odd),
      }))
      .filter(row => row.numericOdd && row.numericOdd > 1);

    const inverseSum = parsedOdds.reduce((total, row) => total + 1 / row.numericOdd, 0);

    if (!investmentValue || inverseSum === 0) {
      return {
        rows: rows.map(row => ({
          ...row,
          stake: 0,
          retorno: 0,
        })),
        retorno: 0,
        lucro: 0,
      };
    }

    const retorno = investmentValue / inverseSum;
    const lucro = retorno - investmentValue;

    const computedRows = rows.map(row => {
      const numericOdd = parseDigitsToNumber(row.odd);
      if (!numericOdd || numericOdd <= 1) {
        return { ...row, stake: 0, retorno: 0 };
      }
      const stake = retorno / numericOdd;
      return {
        ...row,
        stake,
        retorno,
      };
    });

    return {
      rows: computedRows,
      retorno,
      lucro,
    };
  }, [investmentValue, rows]);

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      { id: prev.length + 1, odd: '' },
    ]);
  };

  const handleReset = () => {
    setRows([
      { id: 1, odd: '' },
      { id: 2, odd: '' },
      { id: 3, odd: '' },
    ]);
    setInvestmentInput('100');
  };

  const handleRemoveRow = (id: number) => {
    setRows(prev => {
      if (prev.length <= 1) {
        return prev;
      }
      const filtered = prev.filter(row => row.id !== id);
      return filtered.map((row, index) => ({ ...row, id: index + 1 }));
    });
  };

  const handleCopy = async (value: number, label: string) => {
    try {
      await navigator.clipboard.writeText(value.toFixed(2));
      toast.success(`${label} copiado!`);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível copiar agora.');
    }
  };

  const handleOpenPopupWindow = () => {
    if (typeof window === 'undefined') return;
 
    const width = 620;
    const height = 700;
    const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
    const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
    const screenWidth = window.outerWidth ?? window.innerWidth ?? 1440;
    const screenHeight = window.outerHeight ?? window.innerHeight ?? 900;
    const left = dualScreenLeft + Math.max((screenWidth - width) / 2, 0);
    const top = dualScreenTop + Math.max((screenHeight - height) / 2, 0);
 
    const features = [
      'popup=yes',
      'noopener',
      'noreferrer',
      `width=${width}`,
      `height=${height}`,
      'resizable=yes',
      'scrollbars=yes',
      `left=${left}`,
      `top=${top}`,
    ].join(',');
 
    const popup = window.open('/calculadora-dutching/popup', 'dutching-calculator-popup', features);
 
    if (!popup) {
      toast.error('Não foi possível abrir a janela. Habilite pop-ups para continuar.');
      return;
    }
 
    popup.focus();
  };

  return (
    <section className={containerClasses}>
      {showBackdrop && (
        <div className={cn('pointer-events-none absolute inset-0', overlayOpacity)}>
          <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-0 right-1/4 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        </div>
      )}

      <div className={cn('relative z-10', contentSpacing)}>
        {showHero && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className={cn(headerSpacing, 'min-w-0')}>
              <Badge className="rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary">
                Calculadora
              </Badge>
              <div className="space-y-2">
                <h2 className={titleClass}>Calculadora de Dutching</h2>
                <p className={descriptionClass}>
                  Distribua seu investimento entre múltiplas seleções e garanta o mesmo retorno caso qualquer uma seja vencedora. Informe a odd de cada seleção e descubra quanto investir em cada linha.
                </p>
              </div>
            </div>

            {isPageLike && showLaunchButton && (
              <Button
                variant="outline"
                onClick={handleOpenPopupWindow}
                className="h-11 rounded-xl border-primary/40 bg-primary/10 text-primary transition hover:bg-primary/20"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir em janela flutuante
              </Button>
            )}
          </div>
        )}

        <Card
          className={cn(
            'border border-white/10 backdrop-blur-md',
            isWidget ? 'bg-black/40' : 'bg-[#121214]/90 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.85)]',
          )}
        >
          <CardHeader className={isWidget ? undefined : 'pb-4'}>
            <CardTitle className={cn('text-white', isWidget ? 'text-lg' : 'text-base font-semibold')}>
              Parâmetros gerais
            </CardTitle>
            <CardDescription className="text-white/60">
              Ajuste o investimento total e acompanhe o lucro projetado.
            </CardDescription>
          </CardHeader>
          <CardContent className={cn('space-y-6', !isWidget && 'space-y-5')}>
            <div className="space-y-4">
              <div>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/60">
                  Investimento total
                </span>
                <Input
                  value={investmentInput}
                  onChange={event => setInvestmentInput(event.target.value)}
                  className={cn(
                    'mt-2 h-12 rounded-xl border border-white/10 text-lg font-semibold text-white placeholder:text-white/40 focus-visible:ring-primary',
                    isWidget ? 'bg-white/5' : 'bg-[#18181a]',
                  )}
                  placeholder="Ex: 100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/60">
                    Lucro estimado
                  </span>
                  <p className="mt-1 text-xl font-semibold text-emerald-400">
                    {formatCurrency(Math.max(calculation.lucro, 0))}
                  </p>
                </div>
                <div>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/60">
                    Retorno projetado
                  </span>
                  <p className="mt-1 text-xl font-semibold text-primary">
                    {formatCurrency(Math.max(calculation.retorno, 0))}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-3">
              <div
                className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-white/50"
              >
                <span>#</span>
                <span>Odd</span>
                <span>Investimento</span>
                <span>Retorno</span>
              </div>

              <div className="space-y-2">
                {calculation.rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-4 text-white/80 transition hover:border-primary/40 hover:bg-white/10"
                  >
                    <span className="text-sm font-semibold text-white/60">{index + 1}º</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formatDigitsToDisplay(row.odd)}
                      onChange={event => {
                        const inputValue = event.target.value;
                        const digits = sanitizeDigits(inputValue);
                        setRows(prev =>
                          prev.map(current =>
                            current.id === row.id ? { ...current, odd: digits } : current,
                          ),
                        );
                      }}
                      className={cn(
                        'rounded-lg border border-white/10 text-sm text-white placeholder:text-white/40 focus-visible:ring-primary',
                        isWidget ? 'h-10 bg-black/40 text-base' : 'h-12 bg-[#151517] text-base',
                      )}
                      placeholder="Ex: 2.20"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCopy(row.stake ?? 0, 'Investimento')}
                      className={cn(
                        'justify-between rounded-lg border-white/10 bg-black/30 text-sm font-semibold text-white hover:border-primary/40 hover:bg-primary/20',
                        isWidget ? 'h-10 text-sm' : 'h-12 text-sm',
                      )}
                    >
                      {formatCurrency(Math.max(row.stake ?? 0, 0))}
                      <Copy className="h-4 w-4 text-primary/80" />
                    </Button>
                    <div
                      className={cn(
                        'flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white',
                        isWidget ? 'h-10' : 'h-12',
                      )}
                    >
                      {formatCurrency(Math.max(row.retorno ?? 0, 0))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRow(row.id)}
                      className="h-9 w-9 rounded-full border border-transparent text-white/60 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                'flex flex-col gap-3 sm:flex-row sm:justify-end',
                !isWidget && 'sm:flex-col sm:items-stretch',
              )}
            >
              <Button
                variant="outline"
                onClick={handleAddRow}
                className={cn(
                  'h-11 rounded-xl border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
                  !isWidget ? 'sm:w-full' : 'sm:w-auto',
                )}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar linha
              </Button>
              <Button
                variant="secondary"
                onClick={handleReset}
                className={cn(
                  'h-11 rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/20',
                  !isWidget ? 'sm:w-full' : 'sm:w-auto',
                )}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar
              </Button>
            </div>
          </CardContent>
        </Card>

        {isWidget && (
          <Card className="border border-white/10 bg-black/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg text-white">Como funciona o Dutching?</CardTitle>
              <CardDescription className="text-white/60">
                Entenda a estratégia por trás dos cálculos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/70">
              <p>
                Dutching é a técnica de dividir o risco entre várias apostas para obter o mesmo retorno caso qualquer uma seja vencedora. O cálculo define automaticamente quanto investir em cada seleção para manter o retorno equilibrado.
              </p>
              <p>
                <strong>Odd</strong> é o valor pago pela casa de apostas em determinado evento. Probabilidades maiores resultam em odds menores e vice-versa. Ao informar as odds, a calculadora distribui o investimento proporcionalmente à chance de ganho.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

