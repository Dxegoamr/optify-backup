import { Employee, Transaction, Payment, Account, DaySummary } from '@/types';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'João Silva',
    cpf: '123.456.789-00',
    email: 'joao@example.com',
    phone: '(11) 98765-4321',
    position: 'Desenvolvedor',
    salary: 5000,
    status: 'active',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Maria Santos',
    cpf: '987.654.321-00',
    email: 'maria@example.com',
    phone: '(11) 91234-5678',
    position: 'Designer',
    salary: 4500,
    status: 'active',
    createdAt: '2024-02-20'
  },
  {
    id: '3',
    name: 'Pedro Costa',
    cpf: '456.789.123-00',
    email: 'pedro@example.com',
    phone: '(11) 99876-5432',
    position: 'Gerente',
    salary: 7000,
    status: 'active',
    createdAt: '2024-01-10'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'João Silva',
    amount: 5000,
    type: 'income',
    date: new Date().toISOString(),
    description: 'Pagamento mensal'
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Maria Santos',
    amount: 4500,
    type: 'income',
    date: new Date().toISOString(),
    description: 'Pagamento mensal'
  }
];

export const mockPayments: Payment[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'João Silva',
    amount: 5000,
    status: 'paid',
    dueDate: new Date().toISOString(),
    paidDate: new Date().toISOString()
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Maria Santos',
    amount: 4500,
    status: 'pending',
    dueDate: new Date().toISOString()
  }
];

export const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Conta Principal',
    type: 'fixed',
    value: 10000,
    balance: 15000
  },
  {
    id: '2',
    name: 'Reserva de Emergência',
    type: 'percentage',
    value: 20,
    balance: 3000
  }
];

export const mockDaySummaries: DaySummary[] = [
  {
    date: new Date().toISOString(),
    totalIncome: 12000,
    totalExpense: 4000,
    profit: 8000,
    transactions: mockTransactions
  }
];
