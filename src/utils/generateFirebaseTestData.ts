import { 
  employeeService, 
  transactionService,
  collections,
  createDocument 
} from '@/integrations/firebase/firestore';
import { UserPlatformService } from '@/core/services/user-specific.service';
import { firestoreUtils } from '@/integrations/firebase/firestore';

export const generateFirebaseTestData = async (userId: string) => {
  try {
    console.log('Gerando dados de teste para o usuário:', userId);

    // 1. Criar plataformas de teste
    const testPlatforms = [
      { name: 'Bet365', color: '#00AB4E' },
      { name: 'Betano', color: '#1E90FF' },
      { name: 'BetVip', color: '#FF5C00' },
      { name: 'Sportingbet', color: '#8B5CF6' }
    ];

    console.log('Criando plataformas...');
    const platformIds: string[] = [];
    for (const platform of testPlatforms) {
      const platformId = await UserPlatformService.createPlatform(userId, {
        name: platform.name,
        color: platform.color,
        isActive: true
      });
      platformIds.push(platformId);
    }

    // 2. Criar funcionários de teste
    const testEmployees = [
      {
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao.silva@exemplo.com',
        phone: '(11) 99999-1111',
        birthDate: '1990-05-15',
        payDay: 5,
        salary: 3500.00,
        status: 'active' as const
      },
      {
        name: 'Maria Santos',
        cpf: '987.654.321-00',
        email: 'maria.santos@exemplo.com',
        phone: '(11) 99999-2222',
        birthDate: '1988-12-03',
        payDay: 10,
        salary: 4200.00,
        status: 'active' as const
      },
      {
        name: 'Pedro Costa',
        cpf: '456.789.123-00',
        email: 'pedro.costa@exemplo.com',
        phone: '(11) 99999-3333',
        birthDate: '1992-08-20',
        payDay: 15,
        salary: 2800.00,
        status: 'active' as const
      },
      {
        name: 'Ana Oliveira',
        cpf: '789.123.456-00',
        email: 'ana.oliveira@exemplo.com',
        phone: '(11) 99999-4444',
        birthDate: '1995-03-12',
        payDay: 20,
        salary: 3100.00,
        status: 'active' as const
      },
      {
        name: 'Carlos Ferreira',
        cpf: '321.654.987-00',
        email: 'carlos.ferreira@exemplo.com',
        phone: '(11) 99999-5555',
        birthDate: '1987-11-25',
        payDay: 25,
        salary: 3800.00,
        status: 'active' as const
      }
    ];

    console.log('Criando funcionários...');
    const employeeIds: string[] = [];
    for (const employee of testEmployees) {
      const employeeId = await employeeService.create({
        userId,
        ...employee
      });
      employeeIds.push(employeeId);
    }

    // 3. Criar contas de teste
    const testAccounts = [
      {
        name: 'Conta Principal',
        type: 'fixed' as const,
        value: 10000,
        currentBalance: 8500
      },
      {
        name: 'Reserva de Emergência',
        type: 'percentage' as const,
        value: 20,
        currentBalance: 4200
      }
    ];

    console.log('Criando contas...');
    for (const account of testAccounts) {
      await createDocument(collections.accounts, {
        userId,
        ...account
      });
    }

    // 4. Gerar transações de teste
    console.log('Gerando transações...');
    await generateFirebaseTransactions(userId, employeeIds, platformIds);

    console.log('✅ Dados de teste criados com sucesso!');
    return {
      employees: employeeIds,
      platforms: platformIds
    };
  } catch (error) {
    console.error('Erro ao gerar dados de teste:', error);
    throw error;
  }
};

export const generateFirebaseTransactions = async (userId: string, employeeIds: string[], platformIds: string[]) => {
  try {
    const transactions = [];
    const today = new Date();

    // Gerar transações para os últimos 30 dias
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = firestoreUtils.dateToString(date);
      
      // 2-5 transações por dia
      const transactionsPerDay = Math.floor(Math.random() * 4) + 2;
      
      for (let j = 0; j < transactionsPerDay; j++) {
        const employeeId = employeeIds[Math.floor(Math.random() * employeeIds.length)];
        const platformId = platformIds[Math.floor(Math.random() * platformIds.length)];
        const type = Math.random() > 0.4 ? 'deposit' : 'withdraw';
        const amount = Math.floor(Math.random() * 5000) + 100;

        await transactionService.create({
          userId,
          employeeId,
          platformId,
          type,
          amount,
          description: `${type === 'deposit' ? 'Depósito' : 'Saque'} - ${dateString}`,
          date: dateString
        });
      }
    }

    console.log(`✅ Transações criadas com sucesso!`);
  } catch (error) {
    console.error('Erro ao gerar transações:', error);
    throw error;
  }
};

// Função para executar no console do navegador
(window as any).generateFirebaseTestData = generateFirebaseTestData;

