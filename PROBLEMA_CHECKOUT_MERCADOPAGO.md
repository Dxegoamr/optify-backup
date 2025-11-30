# Problema do Checkout do Mercado Pago

## Problema Identificado

O usuário está tendo problemas ao realizar pagamentos no Mercado Pago:
- Não consegue gerar o QR code do PIX
- Não consegue passar o cartão
- Botão de pagamento fica cinza
- Erros no console do navegador

## Causa Raiz

Após análise do console do navegador, identificamos que:

1. **Ad Blocker bloqueando scripts do Mercado Pago**
   - Múltiplos erros: `Failed to load resource: net::ERR_BLOCKED_BY_ADBLOCKER`
   - Recursos bloqueados:
     - `api.mercadolibre.com/tracks`
     - `melidata.min.js`
     - Scripts de tracking e analytics

2. **Erro de integração do checkout**
   - `Could not send event id` no endpoint `/checkout/api_integration`
   - Falha ao enviar eventos de integração

3. **Aviso de locale não fornecido**
   - `[BRICKS WARN]: None locale was provided, using default`

## Soluções Implementadas

### 1. Melhorias na Configuração da Preferência

Adicionados campos importantes na criação da preferência de pagamento:

```typescript
statement_descriptor: 'OPTIFY',
payer: {
  name: userName,
  email: userEmail,
}
```

### 2. Instruções para Resolver o Problema do Ad Blocker

**Para o usuário resolver o problema:**

1. **Desabilitar o Ad Blocker no navegador:**
   - Chrome/Edge: Clique no ícone de extensão → Desabilitar
   - Firefox: Menu → Complementos → Desabilitar
   - Ou adicionar o site do Mercado Pago à lista de exceções

2. **Verificar se há outras extensões bloqueando:**
   - Desabilitar temporariamente todas as extensões
   - Testar o pagamento novamente

3. **Usar o modo de navegação anônima:**
   - Abrir aba anônima
   - Fazer login e tentar pagar novamente

4. **Limpar cache e cookies:**
   - Limpar dados do navegador
   - Testar novamente

### 3. Verificação de Ambiente

- Verificar se está em ambiente sandbox ou produção
- Verificar se as credenciais do Mercado Pago estão corretas
- Verificar se o token de acesso está válido

## Como Deployar as Correções

1. Compilar as Cloud Functions:
```bash
cd functions
npm run build
```

2. Deploy das funções:
```bash
firebase deploy --only functions
```

3. Testar a integração:
- Acessar a página de planos
- Tentar assinar um plano
- Verificar se o redirecionamento funciona
- Verificar se o pagamento é processado corretamente

## Recomendações para Evitar o Problema

1. **Adicionar aviso na interface:**
   - Alertar usuários sobre ad blockers
   - Instruções visuais para desabilitar

2. **Implementar detecção de ad blocker:**
   - Detectar se o ad blocker está ativo
   - Mostrar mensagem educativa antes do checkout

3. **Considerar Checkout Pro em iframe:**
   - Ao invés de redirecionar, usar iframe
   - Reduz interferência de ad blockers

4. **Testar periodicamente:**
   - Testar em diferentes navegadores
   - Testar com ad blockers ativos
   - Monitorar erros no console

## Próximos Passos

1. ✅ Melhorar configuração da preferência
2. ⏳ Criar componente de aviso sobre ad blocker
3. ⏳ Implementar detecção de ad blocker
4. ⏳ Considerar alternativa de checkout em iframe
5. ⏳ Adicionar logging detalhado para debug

## Arquivos Modificados

- `functions/src/mercadopago.ts` - Adicionado campos payer e statement_descriptor

## Testes Necessários

- [ ] Testar pagamento com PIX
- [ ] Testar pagamento com cartão
- [ ] Testar com ad blocker ativo
- [ ] Testar sem ad blocker
- [ ] Verificar webhook de confirmação
- [ ] Verificar atualização de plano no banco





















