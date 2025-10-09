import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Termos = () => {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">
          Bem-vindo(a) ao Optify. Ao acessar ou utilizar nossos serviços, você concorda com estes Termos de Uso. Leia com atenção.
        </p>

        <section className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">1. Definições</h2>
            <p className="text-muted-foreground">
              Para fins destes termos: “Plataforma” significa o sistema Optify e seus aplicativos; “Usuário” é a pessoa que acessa ou utiliza a Plataforma; “Conta” é o cadastro individual do Usuário.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">2. Aceitação e Elegibilidade</h2>
            <p className="text-muted-foreground">
              O uso da Plataforma implica aceitação integral destes Termos. O Usuário deve ter capacidade civil e fornecer informações verdadeiras e atualizadas no cadastro.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">3. Conta e Segurança</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Você é responsável por manter a confidencialidade das credenciais.</li>
              <li>Notifique-nos imediatamente sobre uso não autorizado da sua Conta.</li>
              <li>Reservamo-nos o direito de suspender contas por violação destes Termos.</li>
            </ul>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">4. Licença de Uso</h2>
            <p className="text-muted-foreground">
              Concedemos ao Usuário uma licença limitada, revogável, não exclusiva e intransferível para utilizar a Plataforma conforme estes Termos. É vedada a engenharia reversa, cópia ou exploração comercial não autorizada.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">5. Planos e Pagamentos</h2>
            <p className="text-muted-foreground">
              Alguns recursos são oferecidos mediante assinatura. Os valores, periodicidade e condições são exibidos na Plataforma e podem ser atualizados. Renovação é periódica até cancelamento pelo Usuário.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">6. Uso Aceitável</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Não publique conteúdo ilegal, ofensivo ou que viole direitos de terceiros.</li>
              <li>Não utilize a Plataforma para fraudes, spams ou atividades maliciosas.</li>
              <li>Não interfira na segurança, disponibilidade ou performance do serviço.</li>
            </ul>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">7. Propriedade Intelectual</h2>
            <p className="text-muted-foreground">
              Todos os direitos sobre marcas, logotipos, códigos e conteúdos da Plataforma pertencem ao Optify ou a seus licenciantes. Nada nestes Termos implica cessão de direitos de propriedade intelectual.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">8. Disponibilidade e Suporte</h2>
            <p className="text-muted-foreground">
              Empregamos boas práticas para manter a disponibilidade. O suporte é prestado prioritariamente via WhatsApp aos clientes, conforme plano contratado.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">9. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground">
              A Plataforma é fornecida "no estado em que se encontra". Não nos responsabilizamos por lucros cessantes, perdas de dados ou danos indiretos decorrentes do uso.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">10. Alterações e Encerramento</h2>
            <p className="text-muted-foreground">
              Podemos atualizar estes Termos ou funcionalidades da Plataforma. Caso não concorde, o Usuário poderá cancelar a assinatura e encerrar o uso.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-2">11. Foro e Legislação</h2>
            <p className="text-muted-foreground">
              Aplica-se a legislação brasileira. Fica eleito o foro da Comarca de São Paulo, SP, para dirimir controvérsias, salvo legislação de defesa do consumidor mais favorável.
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

export default Termos;


