import { useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue } from 'framer-motion';
import { PlatformCard } from './PlatformCard';
import { FreeBetPlatform } from '@/types/freebet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CardStackProps {
  platforms: FreeBetPlatform[];
  onCardClick: (platform: FreeBetPlatform) => void;
}

export const CardStack = ({ platforms, onCardClick }: CardStackProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStart, setDragStart] = useState(0);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const dragThreshold = 50;

  const handleDragStart = () => {
    setDragStart(activeIndex);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    let newIndex = activeIndex;

    if (Math.abs(offset) > dragThreshold || Math.abs(velocity) > 500) {
      if (offset > 0 || velocity > 0) {
        // Arrastou para direita - voltar card anterior
        newIndex = Math.max(0, activeIndex - 1);
      } else {
        // Arrastou para esquerda - avançar próximo card
        newIndex = Math.min(platforms.length - 1, activeIndex + 1);
      }
    }

    setActiveIndex(newIndex);
    x.set(0);
  };

  const goToPrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const goToNext = () => {
    if (activeIndex < platforms.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  if (platforms.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Nenhuma operação criada ainda</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-visible pt-32 pb-16 sm:pt-36 sm:pb-20"
      style={{ minHeight: '32rem' }}
      ref={constraintsRef}
    >
      {/* Setas de navegação */}
      {activeIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {activeIndex < platforms.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={goToNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      {/* Container dos cards */}
      <motion.div
        className="relative h-full w-full"
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={{
          x: 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {platforms.map((platform, index) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            index={index}
            activeIndex={activeIndex}
            onClick={() => onCardClick(platform)}
          />
        ))}
      </motion.div>

      {/* Indicadores de posição */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {platforms.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`
              h-2 w-2 rounded-full transition-all
              ${index === activeIndex ? 'w-8 bg-primary' : 'bg-primary/30'}
            `}
            aria-label={`Ir para operação ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};


