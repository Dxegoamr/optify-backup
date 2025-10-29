import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { UserProfileService } from "@/core/services/user-profile.service";
import { env } from "@/config/env";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export default function PaymentResult({ mode }: { mode: "success" | "failure" | "pending" }) {
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState(mode);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showContent, setShowContent] = useState(mode !== 'pending'); // Mostrar conteúdo imediatamente se não for pending
  
  // Hook para obter informações do usuário autenticado
  const { user } = useFirebaseAuth();

  // Função para buscar perfil do usuário
  const fetchUserProfile = async () => {
    if (!user?.uid) return;
    
    try {
      const profile = await UserProfileService.getUserProfile(user.uid);
      setUserInfo(profile);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  // Função para verificar status do pagamento
  const checkPaymentStatus = async () => {
    if (!paymentId) return;
    
    setCheckingStatus(true);
    try {
      const apiUrl = env.API_URL || 'https://us-central1-optify-definitivo.cloudfunctions.net';
      const url = `${apiUrl}/checkPaymentStatus?paymentId=${paymentId}`;
      
      console.log('🔍 Verificando status do pagamento:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Verificar se a resposta é JSON antes de fazer parse
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text.substring(0, 200));
        throw new Error(`Resposta inválida: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log('✅ Status do pagamento recebido:', paymentData?.status);
      setData(paymentData);
      
      // Se o pagamento foi aprovado, atualizar o modo
      if (paymentData?.status === 'approved') {
        setCurrentMode('success');
        // Recarregar perfil do usuário para ver plano atualizado
        if (user?.uid) {
          await fetchUserProfile();
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      // Não definir erro fatal, apenas logar
    } finally {
      setCheckingStatus(false);
    }
  };

  // Buscar perfil inicial
  useEffect(() => {
    if (user?.uid) {
      fetchUserProfile();
    }
  }, [user?.uid]);

  // Listener em tempo real para mudanças no plano do usuário via Firestore
  useEffect(() => {
    if (!user?.uid) return;

    console.log('👂 Iniciando listener do Firestore para plano do usuário');
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const newPlan = userData?.plano || userData?.plan || 'free';
          const previousPlan = userInfo?.plano || 'free';
          
          console.log('📊 Plano atualizado no Firestore:', {
            previousPlan,
            newPlan,
            isSubscriber: userData?.isSubscriber,
            isActive: userData?.isActive
          });

          setUserInfo(userData);

          // Se o plano mudou e não é mais 'free', atualizar para success
          if (newPlan !== 'free' && newPlan !== previousPlan && currentMode === 'pending') {
            console.log('✅ Plano ativado! Mudando para success');
            setCurrentMode('success');
            // Forçar recarregamento do perfil
            fetchUserProfile();
          }
        }
      },
      (error) => {
        console.error('❌ Erro no listener do Firestore:', error);
      }
    );

    return () => {
      console.log('🔇 Removendo listener do Firestore');
      unsubscribe();
    };
  }, [user?.uid, currentMode]);

  // Monitorar mudanças no plano do usuário (fallback)
  useEffect(() => {
    if (userInfo?.plano && userInfo.plano !== 'free' && currentMode === 'pending') {
      console.log('✅ Plano detectado! Mudando para success');
      setCurrentMode('success');
    }
  }, [userInfo?.plano, currentMode]);

  // Animação quando muda para success
  useEffect(() => {
    if (currentMode === 'success' && mode !== 'success') {
      setShowAnimation(true);
      setTimeout(() => {
        setShowContent(true);
      }, 1500); // Mostrar conteúdo após 1.5s de animação
    } else {
      // Mostrar conteúdo imediatamente para outros modos (pending, failure)
      setShowContent(true);
    }
  }, [currentMode, mode]);

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      return;
    }
    
    // Verificar status inicial
    checkPaymentStatus();
    setLoading(false);

    // Se for pending, verificar periodicamente
    if (currentMode === 'pending') {
      const interval = setInterval(() => {
        checkPaymentStatus();
        fetchUserProfile(); // Verificar se o plano foi atualizado
      }, 5000); // Verificar a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [paymentId, currentMode]);

  const getConfig = () => {
    switch (currentMode) {
      case "success":
        return {
          icon: CheckCircle,
          title: "Pagamento Aprovado!",
          description: "Seu plano foi ativado com sucesso. Aproveite todos os recursos!",
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-500",
          titleColor: "text-foreground",
          descriptionColor: "text-muted-foreground",
          cardBg: "bg-background border-border",
          buttonVariant: "default" as const,
          showRefresh: false
        };
      case "failure":
        return {
          icon: XCircle,
          title: "Pagamento Falhou",
          description: "Não foi possível processar seu pagamento. Tente novamente.",
          iconBg: "bg-red-500/10",
          iconColor: "text-red-500",
          titleColor: "text-foreground",
          descriptionColor: "text-muted-foreground",
          cardBg: "bg-background border-border",
          buttonVariant: "default" as const,
          showRefresh: true
        };
      case "pending":
        return {
          icon: Clock,
          title: "Pagamento Pendente",
          description: "Seu pagamento está sendo processado. Verificando status automaticamente...",
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-500",
          titleColor: "text-foreground",
          descriptionColor: "text-muted-foreground",
          cardBg: "bg-background border-border",
          buttonVariant: "outline" as const,
          showRefresh: true
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Carregando...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        {/* Animação de confetes para success */}
        {showAnimation && currentMode === 'success' && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        )}

        <Card className={`w-full max-w-2xl p-8 ${config.cardBg} border shadow-lg transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="space-y-8">
            {/* Ícone com animação */}
            <div className="flex justify-center">
              <div className={`p-4 rounded-full ${config.iconBg} transition-all duration-1000 ${showContent ? 'scale-100' : 'scale-0'}`}>
                <IconComponent className={`h-12 w-12 ${config.iconColor} ${currentMode === 'success' ? 'animate-pulse' : ''}`} />
              </div>
            </div>

            {/* Título */}
            <div className="text-center space-y-3">
              <h1 className={`text-4xl font-bold ${config.titleColor}`}>
                {config.title}
              </h1>
              <p className={`text-lg ${config.descriptionColor} max-w-md mx-auto`}>
                {config.description}
              </p>
            </div>

            {/* Informações do Pagamento */}
            {paymentId && (
              <div className="bg-muted/50 rounded-xl p-6 border">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-foreground">Detalhes do Pagamento</h3>
                  <p className="text-sm text-muted-foreground">
                    ID: <span className="font-mono bg-muted px-2 py-1 rounded">{paymentId}</span>
                  </p>
                  {userInfo?.plano && (
                    <p className="text-sm text-muted-foreground">
                      Plano Atual: <span className="font-semibold text-foreground capitalize">{userInfo.plano}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Status de Verificação */}
            {checkingStatus && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando status...</span>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="flex items-center gap-2">
                <Link to="/planos">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar aos Planos
                </Link>
              </Button>
              
              <Button asChild variant={config.buttonVariant}>
                <Link to="/dashboard">
                  Ir para Dashboard
                </Link>
              </Button>

              {config.showRefresh && (
                <Button 
                  variant="outline" 
                  onClick={checkPaymentStatus}
                  disabled={checkingStatus}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                  Verificar Status
                </Button>
              )}
            </div>

            {/* Informações Adicionais */}
            <div className="text-center space-y-2 text-sm text-muted-foreground">
              {currentMode === "success" && (
                <>
                  <p>✅ Seu plano foi ativado automaticamente</p>
                  <p>🎉 Você pode gerenciar sua assinatura no seu perfil</p>
                </>
              )}

              {currentMode === "failure" && (
                <>
                  <p>❌ Se o problema persistir, entre em contato conosco</p>
                  <p>💳 Verifique se seus dados de pagamento estão corretos</p>
                </>
              )}

              {currentMode === "pending" && (
                <>
                  <p>⏳ O processamento pode levar alguns minutos</p>
                  <p>📧 Você receberá um email quando o pagamento for confirmado</p>
                  <p>🔄 Esta página atualiza automaticamente</p>
                </>
              )}
            </div>

            {/* Debug Info (apenas em desenvolvimento) */}
            {data && import.meta.env.DEV && (
              <details className="text-left">
                <summary className="cursor-pointer font-semibold text-sm">Debug Info</summary>
                <pre className="mt-2 bg-muted p-4 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
