// src/types/Transaction.ts
export interface Transaction {
  id: string;
  description: string;
  amount: number; // No banco é numeric, aqui float
  type: 'INCOME' | 'EXPENSE';
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  date: string; // ISO String (2025-10-27)
  category: string;
  account: string;
}

// src/utils/formatters.ts
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
};