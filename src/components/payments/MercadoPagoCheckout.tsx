import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePayment, useCreatePreference } from '@/hooks/useMercadoPago';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';

interface MercadoPagoCheckoutProps {
  amount: number;
  description: string;
  externalReference?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

const MercadoPagoCheckout = ({ 
  amount, 
  description, 
  externalReference,
  onSuccess,
  onError 
}: MercadoPagoCheckoutProps) => {
  const [payerEmail, setPayerEmail] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [installments, setInstallments] = useState(1);
  
  const createPayment = useCreatePayment();
  const createPreference = useCreatePreference();

  const handlePayment = async () => {
    if (!payerEmail || !payerName || !paymentMethod) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const paymentData = {
        transaction_amount: amount,
        description,
        payment_method_id: paymentMethod,
        payer: {
          email: payerEmail,
          first_name: payerName.split(' ')[0],
          last_name: payerName.split(' ').slice(1).join(' '),
        },
        external_reference: externalReference,
        installments,
      };

      const result = await createPayment.mutateAsync(paymentData);
      
      if (result.status === 'approved') {
        toast.success('Pagamento aprovado com sucesso!');
        onSuccess?.(result.id);
      } else {
        toast.info(`Pagamento ${result.status}. Verifique o status.`);
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      toast.error('Erro ao processar pagamento');
      onError?.(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const handleCheckout = async () => {
    if (!payerEmail || !payerName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const preferenceData = {
        items: [
          {
            title: description,
            quantity: 1,
            unit_price: amount,
          }
        ],
        payer: {
          name: payerName,
          email: payerEmail,
        },
        external_reference: externalReference,
        back_urls: {
          success: `${window.location.origin}/payment/success`,
          failure: `${window.location.origin}/payment/failure`,
          pending: `${window.location.origin}/payment/pending`,
        },
        auto_return: 'approved',
      };

      const result = await createPreference.mutateAsync(preferenceData);
      
      // Redirecionar para o checkout do Mercado Pago
      window.open(result.init_point, '_blank');
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast.error('Erro ao criar checkout');
      onError?.(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Pagamento via Mercado Pago</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor</Label>
          <Input
            id="amount"
            value={`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payerName">Nome Completo *</Label>
          <Input
            id="payerName"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            placeholder="Digite seu nome completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payerEmail">E-mail *</Label>
          <Input
            id="payerEmail"
            type="email"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            placeholder="Digite seu e-mail"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Método de Pagamento</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o método de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="master">Mastercard</SelectItem>
              <SelectItem value="amex">American Express</SelectItem>
              <SelectItem value="elo">Elo</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentMethod && paymentMethod !== 'pix' && paymentMethod !== 'boleto' && (
          <div className="space-y-2">
            <Label htmlFor="installments">Parcelas</Label>
            <Select value={installments.toString()} onValueChange={(value) => setInstallments(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}x de R$ {(amount / num).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handlePayment}
            disabled={createPayment.isPending}
            className="flex-1"
          >
            {createPayment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Pagar Agora'
            )}
          </Button>
          
          <Button
            onClick={handleCheckout}
            disabled={createPreference.isPending}
            variant="outline"
            className="flex-1"
          >
            {createPreference.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Checkout Mercado Pago'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MercadoPagoCheckout;









