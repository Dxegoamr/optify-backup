import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Privacidade = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* BG animado igual à landing */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[36rem] h-[36rem] bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[36rem] h-[36rem] bg-secondary/20 rounded-full blur-3xl top-1/2 right-0 animate-pulse" />
        <div className="absolute w-[36rem] h-[36rem] bg-primary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />
        <div className="orange-orb absolute w-96 h-96 left-[8%] top-[30%] animate-float-slow" />
        <div className="orange-orb absolute w-[28rem] h-[28rem] left-[55%] top-[10%] animate-float-reverse" />
        <div className="orange-orb absolute w-80 h-80 left-[72%] top-[70%] animate-float-center" />
        <div className="orange-orb absolute w-72 h-72 left-[22%] top-[75%] animate-float-reverse" />
        <div className="orange-beam absolute w-[140%] h-24 left-[-20%] top-[40%] animate-beam" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-10">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">
          Esta Política descreve como tratamos dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
        </p>

        <section className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">1. Controlador e Contato</h2>
            <p className="text-muted-foreground">
              O Optify é o controlador dos dados tratados nesta Plataforma. Para exercer seus direitos, entre em contato pelo nosso canal de suporte (WhatsApp) indicado na Plataforma.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">2. Dados Coletados</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Dados cadastrais (nome, email, telefone).</li>
              <li>Dados de uso (logs de acesso, interações e preferências).</li>
              <li>Dados de transações e operações realizadas na Plataforma.</li>
            </ul>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">3. Bases Legais e Finalidades</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Execução do contrato: viabilizar funcionalidades e suporte ao Usuário.</li>
              <li>Legítimo interesse: aprimorar a experiência, prevenir fraudes e garantir segurança.</li>
              <li>Consentimento: comunicações de marketing quando aplicável (opt-out a qualquer momento).</li>
              <li>Cumprimento legal: registros e obrigações regulatórias.</li>
            </ul>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground">
              Podemos compartilhar dados com prestadores de serviços essenciais à operação (por exemplo, processamento de pagamentos, hospedagem e analytics), sempre sob obrigações de confidencialidade e segurança.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">5. Segurança da Informação</h2>
            <p className="text-muted-foreground">
              Adotamos medidas técnicas e administrativas aptas a proteger os dados pessoais contra acessos não autorizados e incidentes, seguindo boas práticas de segurança e criptografia.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">6. Direitos dos Titulares</h2>
            <p className="text-muted-foreground">
              Em conformidade com a LGPD, você pode solicitar: confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamentos e revisão de decisões automatizadas.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">7. Retenção e Exclusão</h2>
            <p className="text-muted-foreground">
              Mantemos os dados pelo tempo necessário às finalidades descritas e exigências legais. Após esse período, promovemos a exclusão ou anonimização, salvo obrigações de retenção.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">8. Transferências Internacionais</h2>
            <p className="text-muted-foreground">
              Caso haja transferência internacional, garantimos mecanismos adequados de proteção e conformidade com a LGPD.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">9. Atualizações desta Política</h2>
            <p className="text-muted-foreground">
              Esta Política poderá ser atualizada para refletir melhorias ou mudanças regulatórias. Recomendamos revisões periódicas. Em alterações relevantes, notificaremos os Usuários.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}.
          </div>
        </section>
      </main>
    </div>
  );
};

export default Privacidade;


