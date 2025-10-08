import { LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueColor?: 'default' | 'positive' | 'negative';
  onClick?: () => void;
  clickable?: boolean;
}

export const StatCard = ({ title, value, icon: Icon, trend, className, valueColor = 'default', onClick, clickable = false }: StatCardProps) => {
  return (
    <Card 
      className={cn(
        "p-6 card-hover relative overflow-hidden group", 
        clickable && "cursor-pointer hover:scale-105 transition-transform",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={cn(
            "text-4xl font-bold",
            valueColor === 'positive' && "text-success",
            valueColor === 'negative' && "text-destructive",
            valueColor === 'default' && "text-foreground"
          )}>{value}</p>
          {trend && (
            <div className={`inline-flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${
              trend.isPositive 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}% vs. anterior
            </div>
          )}
        </div>
        <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow">
          <Icon className="h-7 w-7 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
};
