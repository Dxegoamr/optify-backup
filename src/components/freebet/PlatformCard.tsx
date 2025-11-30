import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { FreeBetPlatform } from '@/types/freebet';
import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformCardProps {
  platform: FreeBetPlatform;
  index: number;
  activeIndex: number;
  onClick: () => void;
}

export const PlatformCard = ({ platform, index, activeIndex, onClick }: PlatformCardProps) => {
  const isActive = index === activeIndex;
  const offset = index - activeIndex;
  const absOffset = Math.abs(offset);

  const normalizeColor = (color: string) => {
    if (!color) return '#FF7F50';
    if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
      return color;
    }
    return `#${color.replace('#', '').slice(0, 6)}`;
  };

  const toRgba = (color: string, alpha: number) => {
    const normalized = normalizeColor(color);
    const hex = normalized.replace('#', '');
    const expandedHex = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex.padEnd(6, '0');
    const bigint = parseInt(expandedHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const platformColor = normalizeColor(platform.color);
  const glowColor = toRgba(platformColor, 0.35);
  const accentColor = toRgba(platformColor, 0.65);

  // Calcular posição e escala baseado na distância do card ativo
  const getCardStyle = () => {
    if (isActive) {
      return {
        x: 0,
        scale: 1,
        zIndex: 10,
        opacity: 1,
      };
    } else if (offset > 0) {
      // Card à direita
      return {
        x: Math.min(20 + offset * 8, 80),
        scale: Math.max(0.9 - offset * 0.04, 0.7),
        zIndex: 8 - offset,
        opacity: Math.max(0.75 - offset * 0.1, 0.3),
      };
    } else {
      // Card à esquerda
      return {
        x: Math.max(-20 + offset * 8, -80),
        scale: Math.max(0.9 + offset * 0.04, 0.7),
        zIndex: 8 + offset,
        opacity: Math.max(0.75 + offset * 0.1, 0.3),
      };
    }
  };

  const style = getCardStyle();
  const isVisible = absOffset <= 3; // Mostrar apenas cards próximos

  if (!isVisible) return null;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={false}
      animate={{
        x: `${style.x}%`,
        scale: style.scale,
        zIndex: style.zIndex,
        opacity: style.opacity,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
      onClick={isActive ? onClick : undefined}
      style={{
        cursor: isActive ? 'pointer' : 'default',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <div className="relative w-full max-w-2xl px-4 sm:px-10">
        <div
          className={cn(
            'absolute inset-0 blur-3xl transition-all duration-500',
            isActive ? 'opacity-100' : 'opacity-0'
          )}
          style={{ background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 65%)` }}
          aria-hidden="true"
        />

        <Card
          className={cn(
            'relative overflow-hidden border border-white/10 p-10 transition-all duration-300',
            'shadow-[0_25px_70px_-30px_rgba(0,0,0,0.65)]',
            isActive ? 'scale-[1.02]' : 'translate-y-6 scale-[0.94] opacity-90',
            !isActive && 'cursor-default'
          )}
          style={{
            background: `linear-gradient(145deg, ${toRgba(platformColor, 0.95)} 0%, ${accentColor} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25)_0,transparent_55%)] mix-blend-screen" />

          <div className="relative space-y-8 text-white">
            {/* Logo/Nome da plataforma */}
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Operação FreeBet</p>
                <h3 className="text-4xl font-black leading-tight drop-shadow-lg sm:text-5xl">
                  {platform.name}
                </h3>
              </div>

              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10',
                  'backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(0,0,0,0.5)]'
                )}
              >
                {platform.lucroPrejuizo >= 0 ? (
                  <TrendingUp className="h-7 w-7 text-emerald-200" />
                ) : (
                  <TrendingDown className="h-7 w-7 text-rose-200" />
                )}
              </div>
            </div>

            {/* Resumo da operação */}
            <div className="grid gap-5 md:grid-cols-[2fr,3fr]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-white/70">
                  <Users className="h-4 w-4" />
                  Funcionários
                </p>
                <p className="mt-4 text-4xl font-bold">
                  {platform.employeeCount}
                </p>
                <p className="text-xs text-white/70">
                  {platform.employeeCount === 1 ? 'Conta ativa' : 'Contas ativas'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-white/70">
                    Total Apostado
                  </p>
                  <p className="mt-3 text-2xl font-semibold">
                    R$ {platform.totalApostado.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-white/70">
                    Lucro / Prejuízo
                  </p>
                  <p
                    className={cn(
                      'mt-3 text-2xl font-bold',
                      platform.lucroPrejuizo >= 0 ? 'text-emerald-200' : 'text-rose-200'
                    )}
                  >
                    {platform.lucroPrejuizo >= 0 ? '+' : ''}R$ {platform.lucroPrejuizo.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Indicador de card ativo */}
            {isActive && (
              <motion.div
                className="absolute bottom-6 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="h-1 w-24 rounded-full bg-white/70 shadow-[0_8px_20px_rgba(0,0,0,0.25)]" />
              </motion.div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};


