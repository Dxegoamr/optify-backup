# ADR 001: Custom Claims + Firestore Rules para Controle de Acesso

## Status
✅ Aceito

## Contexto

O sistema Optify precisa de controle de acesso granular para diferentes tipos de usuários (admin, regular user). Precisamos garantir segurança tanto no cliente quanto no servidor.

## Decisão

Implementar um sistema de controle de acesso baseado em **Custom Claims do Firebase Auth** combinado com **Firestore Security Rules**.

### Componentes:

1. **Custom Claims**
   - Armazenados no token JWT do usuário
   - Definidos via Cloud Function `setAdminClaim`
   - Apenas superadmins podem definir claims
   - Verificados em cada requisição

2. **Firestore Rules**
   - Validam Custom Claims (`request.auth.token.admin`)
   - Verificam ownership (`request.auth.uid == resource.data.ownerId`)
   - Exigem App Check para operações críticas
   - Validam campos obrigatórios e imutáveis

3. **Frontend Guards**
   - `AdminRouteGuard` para rotas administrativas
   - Verificação via Cloud Function `verifyAdminStatus`
   - Redirecionamento automático para usuários não autorizados

## Alternativas Consideradas

### 1. Apenas Firestore Rules com email hardcoded
❌ **Rejeitado**: Não escala, difícil de manter, sem auditoria

### 2. Sistema de roles no Firestore
❌ **Rejeitado**: Requer mais leituras, não integrado com Auth, mais lento

### 3. Sistema de ACL (Access Control List)
❌ **Rejeitado**: Complexidade desnecessária para o escopo atual

## Consequências

### Positivas
- ✅ Segurança dupla (Auth + Rules)
- ✅ Performance (claims no token, sem leituras extras)
- ✅ Escalabilidade (fácil adicionar novos roles)
- ✅ Auditoria completa
- ✅ Zero confiança no cliente

### Negativas
- ⚠️ Claims são cached (até 1h)
- ⚠️ Requer logout/login após mudança de claim
- ⚠️ Complexidade inicial maior

### Mitigações
- Função `refreshClaims()` para forçar atualização
- Documentação clara sobre cache de claims
- Helper functions para verificação

## Implementação

```typescript
// 1. Definir claim (apenas superadmin)
await setAdminClaim({ uid: 'user123', isAdmin: true });

// 2. Verificar no frontend
const { customClaims, refreshClaims } = useFirebaseAuth();
if (customClaims?.admin) {
  // Usuário é admin
}

// 3. Validar nas Rules
function isAdmin() {
  return request.auth.token.admin == true;
}

match /admin/{doc=**} {
  allow read, write: if isAdmin();
}
```

## Referências

- [Firebase Custom Claims Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Security Best Practices](https://firebase.google.com/docs/rules/best-practices)

---

**Data**: Dezembro 2024  
**Autor**: Diego Kamor  
**Revisores**: -  
**Status**: Implementado e em produção
