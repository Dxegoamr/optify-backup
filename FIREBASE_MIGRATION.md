# 🔥 Migração do Supabase para Firebase

Este guia explica como migrar do Supabase para Firebase Firestore no projeto Optify.

## 📦 Instalação

As dependências do Firebase já foram instaladas:

```bash
npm install firebase
```

## 🔧 Configuração

### 1. Configuração do Firebase

O arquivo `src/integrations/firebase/config.ts` já está configurado com suas credenciais:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyAtSGkJqRedz12n8JUSfWleK1PXKsFRHFA",
  authDomain: "optify-definitivo.firebaseapp.com",
  projectId: "optify-definitivo",
  storageBucket: "optify-definitivo.firebasestorage.app",
  messagingSenderId: "1083748361977",
  appId: "1:1083748361977:web:faf62042d761fddad26428"
};
```

### 2. Estrutura de Dados

O Firestore usa coleções e documentos. A estrutura equivalente ao Supabase:

| Supabase Table | Firestore Collection |
|----------------|---------------------|
| `profiles` | `users` |
| `employees` | `employees` |
| `platforms` | `platforms` |
| `transactions` | `transactions` |
| `daily_summaries` | `dailySummaries` |
| `accounts` | `accounts` |

## 🚀 Como Usar

### 1. Autenticação

```typescript
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

const { user, signIn, signUp, logout } = useFirebaseAuth();
```

### 2. CRUD Operations

```typescript
import { useEmployees, useCreateEmployee } from '@/hooks/useFirestore';

// Buscar funcionários
const { data: employees } = useEmployees(user?.uid);

// Criar funcionário
const createEmployee = useCreateEmployee();
await createEmployee.mutateAsync({
  userId: user.uid,
  name: 'João Silva',
  cpf: '123.456.789-00',
  salary: 3000,
  status: 'active'
});
```

### 3. Dados de Teste

Para gerar dados de teste com Firebase:

```typescript
import { generateFirebaseTestData } from '@/utils/generateFirebaseTestData';

// No console do navegador ou em um componente
await generateFirebaseTestData(user.uid);
```

## 🔄 Migração Passo a Passo

### 1. Substituir Context de Autenticação

```typescript
// Antes (Supabase)
import { AuthProvider } from '@/contexts/AuthContext';

// Depois (Firebase)
import { FirebaseAuthProvider } from '@/contexts/FirebaseAuthContext';
```

### 2. Atualizar Hooks

```typescript
// Antes (Supabase)
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const { data } = useQuery({
  queryKey: ['employees'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id);
    return data;
  }
});

// Depois (Firebase)
import { useEmployees } from '@/hooks/useFirestore';

const { data: employees } = useEmployees(user?.uid);
```

### 3. Atualizar Componentes

```typescript
// Antes
const { data: { user } } = await supabase.auth.getUser();

// Depois
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
const { user } = useFirebaseAuth();
```

## 📊 Principais Diferenças

### Supabase vs Firebase

| Aspecto | Supabase | Firebase |
|---------|----------|----------|
| **Autenticação** | `supabase.auth.getUser()` | `useFirebaseAuth()` |
| **Queries** | SQL-like com `.select()` | Firestore queries |
| **Real-time** | `.subscribe()` | `onSnapshot()` |
| **Filtros** | `.eq()`, `.gte()` | `where()`, `orderBy()` |
| **IDs** | UUIDs automáticos | Document IDs customizáveis |

### Queries Equivalentes

```typescript
// Supabase
const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// Firebase
const employees = await getDocuments('employees', [
  where('userId', '==', user.uid),
  orderBy('createdAt', 'desc')
]);
```

## 🛠️ Ferramentas Disponíveis

### 1. Serviços CRUD
- `employeeService` - CRUD de funcionários
- `platformService` - CRUD de plataformas
- `transactionService` - CRUD de transações

### 2. Hooks React Query
- `useEmployees()` - Buscar funcionários
- `useCreateEmployee()` - Criar funcionário
- `useUpdateEmployee()` - Atualizar funcionário
- `useDeleteEmployee()` - Deletar funcionário

### 3. Utilitários
- `firestoreUtils` - Funções auxiliares
- `createDocument()` - Criar documento
- `updateDocument()` - Atualizar documento
- `deleteDocument()` - Deletar documento

## 🧪 Testando

1. **Importe o contexto Firebase** no App.tsx
2. **Use os hooks** nos componentes
3. **Gere dados de teste** com `generateFirebaseTestData()`
4. **Verifique no Console do Firebase** se os dados foram criados

## 📝 Notas Importantes

- **Timestamps**: Firebase usa `serverTimestamp()` em vez de `now()`
- **IDs**: Documentos do Firestore têm IDs automáticos ou customizáveis
- **Estrutura**: Firestore é NoSQL, não há tabelas relacionais
- **Queries**: Mais limitadas que SQL, mas mais simples
- **Real-time**: Suporte nativo com `onSnapshot()`

## 🔍 Debugging

Para debugar problemas:

1. **Console do Firebase** - Ver dados em tempo real
2. **React Query DevTools** - Ver cache e queries
3. **Network tab** - Ver requisições HTTP
4. **Firestore Rules** - Verificar permissões

## 📚 Recursos Adicionais

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Web SDK](https://firebase.google.com/docs/firestore/quickstart)
- [React Query + Firebase](https://react-query.tanstack.com/guides/important-defaults)

---

**Pronto para migrar!** 🚀

Use os arquivos criados como base e adapte gradualmente os componentes existentes.

