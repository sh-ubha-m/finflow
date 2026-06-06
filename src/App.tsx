import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Transaction, Budget, ExpenseCategory, TransactionCategory } from './types';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { BudgetPlanner } from './components/BudgetPlanner';

// --- DYNAMIC MOCK DATA GENERATOR ---
// Generates records relative to the current system date so that the project 
// looks visually complete immediately on first load.
const getInitialMockTransactions = (): Transaction[] => {
  const list: Transaction[] = [];
  const today = new Date();
  
  const getDateOffset = (daysAgo: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // 1. Current Month Mock Data
  list.push(
    { id: '1', title: 'Monthly Corporate Salary', amount: 5200, date: getDateOffset(5), category: 'Salary', type: 'income', description: 'Tech Corp monthly base pay' },
    { id: '2', title: 'Freelance UI Redesign', amount: 850, date: getDateOffset(2), category: 'Freelance & Side Hustle', type: 'income', description: 'Contract mobile Figma mockup' },
    { id: '3', title: 'Apartment Rent', amount: 1400, date: getDateOffset(5), category: 'Rent & Housing', type: 'expense', description: 'Monthly housing fee' },
    { id: '4', title: 'Organic Supermarket Shop', amount: 284.50, date: getDateOffset(4), category: 'Food & Dining', type: 'expense', description: 'Weekly groceries' },
    { id: '5', title: 'Electricity & Gas bill', amount: 112.30, date: getDateOffset(3), category: 'Utilities & Bills', type: 'expense', description: 'Electric utility monthly bill' },
    { id: '6', title: 'Dinner & Sushi with Friends', amount: 95.00, date: getDateOffset(1), category: 'Entertainment & Leisure', type: 'expense', description: 'Weekend hangout' }
  );

  // 2. 1 Month Ago Mock Data
  list.push(
    { id: '11', title: 'Monthly Corporate Salary', amount: 5200, date: getDateOffset(35), category: 'Salary', type: 'income', description: 'Tech Corp monthly base pay' },
    { id: '12', title: 'Contract Web Development', amount: 1200, date: getDateOffset(28), category: 'Freelance & Side Hustle', type: 'income', description: 'React consulting project' },
    { id: '13', title: 'Apartment Rent', amount: 1400, date: getDateOffset(35), category: 'Rent & Housing', type: 'expense', description: 'Monthly housing fee' },
    { id: '14', title: 'Organic Supermarket Shop', amount: 310.20, date: getDateOffset(32), category: 'Food & Dining', type: 'expense', description: 'Monthly stock up' },
    { id: '15', title: 'Internet & Wifi router', amount: 59.99, date: getDateOffset(30), category: 'Utilities & Bills', type: 'expense', description: 'Fiber broadband speed package' },
    { id: '16', title: 'Summer Sneakers', amount: 120.00, date: getDateOffset(25), category: 'Shopping', type: 'expense', description: 'Nike runners' },
    { id: '17', title: 'Monthly Train Pass', amount: 80.00, date: getDateOffset(22), category: 'Transportation', type: 'expense', description: 'Local commute ticket' }
  );

  // 3. 2 Months Ago Mock Data
  list.push(
    { id: '21', title: 'Monthly Corporate Salary', amount: 5200, date: getDateOffset(65), category: 'Salary', type: 'income', description: 'Tech Corp monthly base pay' },
    { id: '22', title: 'Stock Investment Dividend', amount: 350, date: getDateOffset(60), category: 'Investments', type: 'income', description: 'Quarterly payout' },
    { id: '23', title: 'Apartment Rent', amount: 1400, date: getDateOffset(65), category: 'Rent & Housing', type: 'expense', description: 'Monthly housing fee' },
    { id: '24', title: 'Organic Supermarket Shop', amount: 245.10, date: getDateOffset(62), category: 'Food & Dining', type: 'expense', description: 'Weekly groceries' },
    { id: '25', title: 'Heating utilities', amount: 135.50, date: getDateOffset(61), category: 'Utilities & Bills', type: 'expense', description: 'Central heating gas bill' },
    { id: '26', title: 'Concert Tickets', amount: 180.00, date: getDateOffset(55), category: 'Entertainment & Leisure', type: 'expense', description: 'Music festival pass' },
    { id: '27', title: 'Pharmacy & Prescription', amount: 45.00, date: getDateOffset(50), category: 'Healthcare', type: 'expense', description: 'Allergy medication refill' }
  );

  return list;
};

// Seed baseline budget goals
const getInitialMockBudgets = (): Budget[] => [
  { category: 'Food & Dining', limit: 400 },
  { category: 'Rent & Housing', limit: 1500 },
  { category: 'Utilities & Bills', limit: 200 },
  { category: 'Entertainment & Leisure', limit: 150 },
  { category: 'Shopping', limit: 300 }
];

// --- BEGINNER-FRIENDLY CSV ROW PARSER ---
// A clean, stateful character loop that splits columns by comma,
// but correctly ignores commas that fall inside double-quoted text fields.
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let currentToken = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes; // Toggle quote mode
    } else if (char === ',' && !inQuotes) {
      result.push(currentToken.trim());
      currentToken = ''; // Reset for the next column
    } else {
      currentToken += char;
    }
  }
  result.push(currentToken.trim()); // Push the final column
  return result;
}

export const App: React.FC = () => {
  // --- STATE PERSISTED VIA LOCAL STORAGE ---
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('finance_transactions', []);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>('finance_budgets', []);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('finance_theme', 'dark');
  
  // --- UI NAVIGATION & EDITING STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- SEED MOCK DATA IF STORE IS EMPTY ---
  // List all hook dependency variables to satisfy the ESLint rule. 
  // The length checks prevent it from running more than once on app startup.
  useEffect(() => {
    if (transactions.length === 0) {
      setTransactions(getInitialMockTransactions());
    }
    if (budgets.length === 0) {
      setBudgets(getInitialMockBudgets());
    }
  }, [transactions.length, budgets.length, setTransactions, setBudgets]);

  // Sync data-theme attribute on document root for styling
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // --- TRANSACTION HANDLERS (CRUD) ---
  const handleSaveTransaction = (data: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      // UPDATE: Replace item with matching id, preserving its ID
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingTransaction.id ? { ...data, id: editingTransaction.id } : t))
      );
      setEditingTransaction(null);
    } else {
      // CREATE: Generate a new ID and prepend the item to the list
      const newTransaction: Transaction = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      };
      setTransactions((prev) => [newTransaction, ...prev]);
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // --- BUDGET HANDLERS ---
  const handleSaveBudget = (budget: Budget) => {
    setBudgets((prev) => {
      const exists = prev.some((b) => b.category === budget.category);
      if (exists) {
        // Update existing limit
        return prev.map((b) => (b.category === budget.category ? budget : b));
      }
      // Add new budget entry
      return [...prev, budget];
    });
  };

  const handleDeleteBudget = (category: ExpenseCategory) => {
    setBudgets((prev) => prev.filter((b) => b.category !== category));
  };

  // --- CSV DATA IMPORT / EXPORT ---
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['ID', 'Title', 'Amount', 'Date', 'Category', 'Type', 'Description'];
    const csvRows = [headers.join(',')];

    transactions.forEach((t) => {
      const row = [
        `"${t.id}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        t.amount,
        `"${t.date}"`,
        `"${t.category}"`,
        `"${t.type}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial_ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split('\n');
        const imported: Transaction[] = [];

        // Skip the header row (index 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse using our clean column parser helper
          const columns = parseCSVRow(line);
          if (columns.length < 6) continue;

          const title = columns[1];
          const amount = parseFloat(columns[2]);
          const date = columns[3];
          const category = columns[4] as TransactionCategory;
          const type = columns[5] as 'income' | 'expense';
          const description = columns[6] || '';

          if (title && !isNaN(amount) && amount > 0 && date && (type === 'income' || type === 'expense')) {
            imported.push({
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
              title,
              amount,
              date,
              category,
              type,
              description,
            });
          }
        }

        if (imported.length > 0) {
          setTransactions((prev) => [...imported, ...prev]);
          alert(`Successfully imported ${imported.length} transactions!`);
        } else {
          alert('Could not find any valid transaction rows. Please check file format.');
        }
      } catch (err) {
        console.error('Error importing CSV:', err);
        alert('An error occurred while parsing the CSV file.');
      }
      e.target.value = ''; // Reset file input
    };

    reader.readAsText(file);
  };

  return (
    <main className="app-container animate-fade-in">
      {/* APP HEADER */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">$</div>
          <div>
            <h1>FinFlow</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              Personal Finance Manager
            </span>
          </div>
        </div>

        <div className="header-actions">
          {/* Theme Toggle Button */}
          <button 
            className="btn btn-secondary btn-icon-only" 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>

          {/* Import / Export Controls */}
          <div className="data-actions">
            <button className="btn btn-secondary" onClick={handleExportCSV} title="Download transaction ledger as CSV">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export
            </button>
            <label className="btn btn-secondary import-btn-label" title="Upload and parse a transactions CSV">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Import
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleImportCSV}
              />
            </label>
          </div>

          {/* Add Transaction Action */}
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5v14"/>
            </svg>
            Add Transaction
          </button>
        </div>
      </header>

      {/* PRIMARY TAB NAVIGATION */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Ledger
        </button>
        <button
          className={`tab-btn ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setActiveTab('budgets')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Budgets
        </button>
      </nav>

      {/* ACTIVE VIEW TAB CONTENT */}
      <div className="tab-view-content" style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && <Dashboard transactions={transactions} />}
        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditClick}
            onDelete={handleDeleteTransaction}
          />
        )}
        {activeTab === 'budgets' && (
          <BudgetPlanner
            transactions={transactions}
            budgets={budgets}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
          />
        )}
      </div>

      {/* DIALOG TRANSACTION FORM MODAL */}
      {/* 
        Keying this component by the ID (or 'new') forces React to reconstruct the state 
        whenever editing target changes. This cleans up state sync inside the modal completely!
      */}
      {isFormOpen && (
        <TransactionForm
          key={editingTransaction ? editingTransaction.id : 'new'}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
          onSubmit={handleSaveTransaction}
          editingTransaction={editingTransaction}
        />
      )}
    </main>
  );
};
