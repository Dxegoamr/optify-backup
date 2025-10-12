import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

export default function PaymentResult({ mode }: { mode: "success" | "failure" | "pending" }) {
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      return;
    }
    
    fetch(`${import.meta.env.VITE_API_URL}/checkPaymentStatus?paymentId=${paymentId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [paymentId]);

  const getConfig = () => {
    switch (mode) {
      case "success":
        return {
          icon: CheckCircle,
          title: "✅ Pagamento Aprovado!",
          description: "Seu plano foi ativado com sucesso. Aproveite todos os recursos!",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200"
        };
      case "failure":
        return {
          icon: XCircle,
          title: "❌ Pagamento Falhou",
          description: "Não foi possível processar seu pagamento. Tente novamente.",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200"
        };
      case "pending":
        return {
          icon: Clock,
          title: "⏳ Pagamento Pendente",
          description: "Seu pagamento está sendo processado. Você será notificado em breve.",
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200"
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className={`w-full max-w-2xl p-8 text-center ${config.bgColor} ${config.borderColor} border-2`}>
          <div className="space-y-6">
            {/* Ícone */}
            <div className="flex justify-center">
              <IconComponent className={`h-16 w-16 ${config.color}`} />
            </div>

            {/* Título */}
            <div>
              <h1 className={`text-3xl font-bold ${config.color} mb-2`}>
                {config.title}
              </h1>
              <p className="text-muted-foreground text-lg">
                {config.description}
              </p>
            </div>

            {/* Informações do Pagamento */}
            {paymentId && (
              <div className="bg-white/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Detalhes do Pagamento</h3>
                <p className="text-sm text-muted-foreground">
                  ID do Pagamento: <span className="font-mono">{paymentId}</span>
                </p>
              </div>
            )}

            {/* Dados da API (apenas para debug em desenvolvimento) */}
            {data && import.meta.env.DEV && (
              <details className="text-left">
                <summary className="cursor-pointer font-semibold">Dados da API (Debug)</summary>
                <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="flex items-center gap-2">
                <Link to="/planos">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar aos Planos
                </Link>
              </Button>
              
              <Button asChild variant="outline">
                <Link to="/dashboard">
                  Ir para Dashboard
                </Link>
              </Button>
            </div>

            {/* Informações Adicionais */}
            {mode === "success" && (
              <div className="text-sm text-muted-foreground">
                <p>Seu plano foi ativado automaticamente.</p>
                <p>Você pode gerenciar sua assinatura no seu perfil.</p>
              </div>
            )}

            {mode === "failure" && (
              <div className="text-sm text-muted-foreground">
                <p>Se o problema persistir, entre em contato conosco.</p>
                <p>Verifique se seus dados de pagamento estão corretos.</p>
              </div>
            )}

            {mode === "pending" && (
              <div className="text-sm text-muted-foreground">
                <p>O processamento pode levar alguns minutos.</p>
                <p>Você receberá um email quando o pagamento for confirmado.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
