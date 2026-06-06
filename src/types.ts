export type TransactionType = 'income' | 'expense';

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Rent & Housing',
  'Utilities & Bills',
  'Transportation',
  'Entertainment & Leisure',
  'Shopping',
  'Healthcare',
  'Education',
  'Other Expense'
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance & Side Hustle',
  'Investments',
  'Gifts',
  'Other Income'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];
export type TransactionCategory = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: TransactionCategory;
  type: TransactionType;
  description: string;
}

export interface Budget {
  category: ExpenseCategory;
  limit: number;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}
