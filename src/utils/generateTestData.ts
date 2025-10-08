import { supabase } from '@/integrations/supabase/client';

export const generateTestEmployees = async () => {
  try {
    // Primeiro, vamos obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('Usuário não autenticado');
      return;
    }

    console.log('Gerando funcionários para o usuário:', user.id);

    // Dados dos funcionários de teste
    const testEmployees = [
      {
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao.silva@exemplo.com',
        phone: '(11) 99999-1111',
        birth_date: '1990-05-15',
        pay_day: 5,
        salary: 3500.00,
        status: 'active'
      },
      {
        name: 'Maria Santos',
        cpf: '987.654.321-00',
        email: 'maria.santos@exemplo.com',
        phone: '(11) 99999-2222',
        birth_date: '1988-12-03',
        pay_day: 10,
        salary: 4200.00,
        status: 'active'
      },
      {
        name: 'Pedro Costa',
        cpf: '456.789.123-00',
        email: 'pedro.costa@exemplo.com',
        phone: '(11) 99999-3333',
        birth_date: '1992-08-20',
        pay_day: 15,
        salary: 2800.00,
        status: 'active'
      },
      {
        name: 'Ana Oliveira',
        cpf: '789.123.456-00',
        email: 'ana.oliveira@exemplo.com',
        phone: '(11) 99999-4444',
        birth_date: '1995-03-12',
        pay_day: 20,
        salary: 3100.00,
        status: 'active'
      },
      {
        name: 'Carlos Ferreira',
        cpf: '321.654.987-00',
        email: 'carlos.ferreira@exemplo.com',
        phone: '(11) 99999-5555',
        birth_date: '1987-11-25',
        pay_day: 25,
        salary: 3800.00,
        status: 'active'
      }
    ];

    // Inserir funcionários no banco
    const { data, error } = await supabase
      .from('employees')
      .insert(
        testEmployees.map(emp => ({
          ...emp,
          user_id: user.id
        }))
      )
      .select();

    if (error) {
      console.error('Erro ao inserir funcionários:', error);
      return;
    }

    console.log('✅ Funcionários criados com sucesso:', data);
    
    // Gerar algumas transações de teste
    await generateTestTransactions(user.id, data);
    
    return data;
  } catch (error) {
    console.error('Erro ao gerar dados de teste:', error);
  }
};

export const generateTestTransactions = async (userId: string, employees: any[]) => {
  try {
    // Criar algumas plataformas de teste primeiro
    const { data: platforms } = await supabase
      .from('platforms')
      .select('*')
      .eq('user_id', userId);

    if (!platforms || platforms.length === 0) {
      // Criar plataformas de teste
      const testPlatforms = [
        { name: 'Bet365', color: '#00AB4E' },
        { name: 'Betano', color: '#1E90FF' },
        { name: 'BetVip', color: '#FF5C00' },
        { name: 'Sportingbet', color: '#8B5CF6' }
      ];

      const { data: newPlatforms } = await supabase
        .from('platforms')
        .insert(
          testPlatforms.map(platform => ({
            ...platform,
            user_id: userId
          }))
        )
        .select();

      if (newPlatforms) {
        platforms.push(...newPlatforms);
      }
    }

    // Gerar transações de teste para os últimos 30 dias
    const transactions = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 2-5 transações por dia
      const transactionsPerDay = Math.floor(Math.random() * 4) + 2;
      
      for (let j = 0; j < transactionsPerDay; j++) {
        const employee = employees[Math.floor(Math.random() * employees.length)];
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const type = Math.random() > 0.4 ? 'deposit' : 'withdraw'; // 60% depósitos, 40% saques
        const amount = Math.floor(Math.random() * 5000) + 100; // Entre R$ 100 e R$ 5000

        transactions.push({
          user_id: userId,
          employee_id: employee.id,
          platform_id: platform.id,
          type,
          amount,
          description: `${type === 'deposit' ? 'Depósito' : 'Saque'} - ${platform.name}`,
          transaction_date: date.toISOString().split('T')[0]
        });
      }
    }

    // Inserir transações
    const { error } = await supabase
      .from('transactions')
      .insert(transactions);

    if (error) {
      console.error('Erro ao inserir transações:', error);
      return;
    }

    console.log(`✅ ${transactions.length} transações criadas com sucesso`);
  } catch (error) {
    console.error('Erro ao gerar transações de teste:', error);
  }
};

// Função para executar no console do navegador
(window as any).generateTestData = generateTestEmployees;

