import React, { useState } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useEmployees, useCreateEmployee } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

/**
 * Exemplo de como usar Firebase Firestore no lugar do Supabase
 * Este componente demonstra:
 * - Autenticação com Firebase
 * - CRUD de funcionários
 * - React Query integration
 */

const FirebaseExample: React.FC = () => {
  const { user, signIn, signUp, logout } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Usar hook do Firestore para funcionários
  const { data: employees = [], isLoading } = useEmployees(user?.uid || '');
  const createEmployee = useCreateEmployee();

  const handleSignUp = async () => {
    try {
      await signUp(email, password, name);
      console.log('Usuário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      console.log('Login realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  const handleCreateEmployee = async () => {
    if (!user?.uid) return;

    try {
      await createEmployee.mutateAsync({
        userId: user.uid,
        name: 'Funcionário Teste',
        cpf: '123.456.789-00',
        email: 'teste@exemplo.com',
        salary: 3000,
        status: 'active'
      });
      console.log('Funcionário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
    }
  };

  if (!user) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Firebase Authentication</h2>
        
        <div className="space-y-4">
          <Input
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <div className="flex gap-2">
            <Button onClick={handleSignUp} className="flex-1">
              Criar Conta
            </Button>
            <Button onClick={handleSignIn} variant="outline" className="flex-1">
              Entrar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Firebase Firestore Demo</h2>
        <Button onClick={logout} variant="outline">
          Logout
        </Button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Logado como: {user.email}
        </p>
        <p className="text-sm text-muted-foreground">
          User ID: {user.uid}
        </p>
      </div>

      <div className="space-y-4">
        <Button onClick={handleCreateEmployee} disabled={createEmployee.isPending}>
          {createEmployee.isPending ? 'Criando...' : 'Criar Funcionário Teste'}
        </Button>

        <div>
          <h3 className="text-lg font-semibold mb-2">Funcionários:</h3>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-2">
              {employees.length === 0 ? (
                <p className="text-muted-foreground">Nenhum funcionário encontrado</p>
              ) : (
                employees.map((employee: any) => (
                  <div key={employee.id} className="p-2 border rounded">
                    <p><strong>Nome:</strong> {employee.name}</p>
                    <p><strong>CPF:</strong> {employee.cpf}</p>
                    <p><strong>Salário:</strong> R$ {employee.salary}</p>
                    <p><strong>Status:</strong> {employee.status}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default FirebaseExample;

