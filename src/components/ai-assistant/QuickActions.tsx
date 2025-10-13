import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Target, FileText, ShoppingCart, HelpCircle } from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: string;
}

interface QuickActionsProps {
  onAction: (message: string) => void;
}

export const QuickActions = ({ onAction }: QuickActionsProps) => {
  const quickActions: QuickAction[] = [
    {
      title: 'Cadastrar Funcionário',
      description: 'Adicionar novo colaborador ao sistema',
      icon: Users,
      action: () => onAction('Como adicionar um novo funcionário?'),
      category: 'Funcionários'
    },
    {
      title: 'Registrar Venda',
      description: 'Registrar uma nova venda/transação',
      icon: DollarSign,
      action: () => onAction('Como registrar uma venda?'),
      category: 'Transações'
    },
    {
      title: 'Definir Meta Mensal',
      description: 'Configurar objetivo financeiro',
      icon: Target,
      action: () => onAction('Como definir uma meta mensal?'),
      category: 'Metas'
    },
    {
      title: 'Gerar Relatório',
      description: 'Criar relatórios financeiros',
      icon: FileText,
      action: () => onAction('Como gerar relatórios?'),
      category: 'Relatórios'
    },
    {
      title: 'Adicionar Plataforma',
      description: 'Configurar nova plataforma de vendas',
      icon: ShoppingCart,
      action: () => onAction('Como adicionar uma plataforma de vendas?'),
      category: 'Plataformas'
    },
    {
      title: 'Ajuda Geral',
      description: 'Entender como funciona o sistema',
      icon: HelpCircle,
      action: () => onAction('Como funciona o sistema Optify?'),
      category: 'Sistema'
    }
  ];

  const categories = Array.from(new Set(quickActions.map(action => action.category)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Clique em uma ação para obter ajuda específica
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickActions
                  .filter(action => action.category === category)
                  .map((action) => (
                    <Button
                      key={action.title}
                      variant="outline"
                      className="h-auto p-4 justify-start text-left"
                      onClick={action.action}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <action.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{action.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {action.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              💡 Dica
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Você também pode digitar sua pergunta diretamente no chat. 
            O assistente entende perguntas em português e pode ajudar com qualquer operação do sistema.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
