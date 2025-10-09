import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Mail, Clock } from "lucide-react";

const Suporte = () => {
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

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Central de Suporte</h1>
          <p className="text-muted-foreground text-lg">
            Estamos aqui para ajudar você a aproveitar ao máximo o Optify
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <a
            href="https://wa.me/556295536121"
            target="_blank"
            rel="noreferrer"
            className="glass rounded-xl p-6 hover:shadow-glow transition-all card-hover"
          >
            <div className="flex items-center gap-4">
              <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              <div>
                <h3 className="font-semibold text-lg">WhatsApp</h3>
                <p className="text-sm text-muted-foreground">Suporte 24h</p>
              </div>
            </div>
          </a>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-4">
              <Mail className="h-6 w-6 text-white" />
              <div>
                <h3 className="font-semibold text-lg">Email</h3>
                <p className="text-sm text-muted-foreground">suporte@optify.com.br</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Horários de Atendimento</h2>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Atendimento 24 horas</p>
                <p className="text-sm text-muted-foreground">WhatsApp disponível a qualquer momento</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Perguntas Frequentes</h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Como faço para cancelar minha assinatura?</p>
                <p className="text-sm text-muted-foreground">Você pode cancelar através do seu painel de controle ou entrando em contato conosco.</p>
              </div>
              <div>
                <p className="font-medium">Posso importar dados de outros sistemas?</p>
                <p className="text-sm text-muted-foreground">Sim! Oferecemos importação em CSV/Excel para funcionários e transações.</p>
              </div>
              <div>
                <p className="font-medium">Meus dados estão seguros?</p>
                <p className="text-sm text-muted-foreground">Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança.</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Documentação</h2>
            <div className="space-y-2">
              <a href="/termos" className="block text-primary hover:underline">Termos de Uso</a>
              <a href="/privacidade" className="block text-primary hover:underline">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Suporte;
