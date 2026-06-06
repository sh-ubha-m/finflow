import React, { useMemo } from 'react';
import { EXPENSE_CATEGORIES } from '../types';
import type { Transaction } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  currencySymbol: string;
}

// --- GLOBAL STATIC CONFIGURATION ---
// Defined outside the component to prevent it from being recreated on every render.
// This resolves the ESLint warning regarding missing dependencies in useMemo.
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f59e0b', // Amber/Yellow
  'Rent & Housing': '#3b82f6', // Blue
  'Utilities & Bills': '#06b6d4', // Cyan
  'Transportation': '#8b5cf6', // Violet
  'Entertainment & Leisure': '#ec4899', // Pink
  'Shopping': '#14b8a6', // Teal
  'Healthcare': '#ef4444', // Red
  'Education': '#10b981', // Emerald
  'Other Expense': '#6b7280', // Gray
};

export const Dashboard: React.FC<DashboardProps> = ({ transactions, currencySymbol }) => {
  
  // --- 1. CALCULATE GENERAL KPIs ---
  // useMemo caches these calculations so they only rerun when "transactions" array changes.
  const kpis = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    // Loop through all transactions to sum income vs expenses
    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    });

    const totalBalance = totalIncome - totalExpenses;
    
    // Savings Rate formula: ((Income - Expenses) / Income) * 100
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      // Keep only 1 decimal point, and ensure it doesn't go below 0 for display
      savingsRate: Math.max(0, parseFloat(savingsRate.toFixed(1))),
    };
  }, [transactions]);


  // --- 2. PREPARE EXPENSE BREAKDOWN ---
  // Groups spending by category and sorts them descending.
  const expenseBreakdown = useMemo(() => {
    const categoriesMap: Record<string, number> = {};
    let totalExp = 0;

    // Initialize map keys with 0 to ensure all categories exist
    EXPENSE_CATEGORIES.forEach((cat) => {
      categoriesMap[cat] = 0;
    });

    // Sum expense amounts per category
    transactions.forEach((t) => {
      if (t.type === 'expense') {
        categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
        totalExp += t.amount;
      }
    });

    // Convert category map into a sorted list of objects
    const data = Object.keys(categoriesMap)
      .map((cat) => {
        const amount = categoriesMap[cat];
        const percent = totalExp > 0 ? (amount / totalExp) * 100 : 0;
        return {
          category: cat,
          amount,
          percent: parseFloat(percent.toFixed(1)),
          color: CATEGORY_COLORS[cat] || '#6b7280',
        };
      })
      .filter((item) => item.amount > 0) // Only show categories with actual spending
      .sort((a, b) => b.amount - a.amount); // Sort from highest spent to lowest

    return { data, totalExpense: totalExp };
  }, [transactions]);


  // --- 3. PREPARE MONTHLY TREND (Last 6 Months) ---
  // Groups income vs expenses dynamically based on calendar months.
  const monthlyTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    
    const groups: Record<string, { income: number; expense: number; monthName: string; sortKey: string }> = {};
    const last6MonthsKeys: string[] = [];
    
    // Generate empty structures for the last 6 months (chronological order)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      
      last6MonthsKeys.push(key);
      groups[key] = {
        income: 0,
        expense: 0,
        monthName: `${months[monthIdx]} ${String(year).slice(-2)}`,
        sortKey: key,
      };
    }

    // Accumulate transaction amounts into their respective months
    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return;
      const key = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (groups[key]) {
        if (t.type === 'income') {
          groups[key].income += t.amount;
        } else {
          groups[key].expense += t.amount;
        }
      }
    });

    return last6MonthsKeys.map((key) => groups[key]);
  }, [transactions]);


  // --- 4. MAX VALUE HELPER FOR CHART SCALING ---
  // Finds the single highest transaction value in the last 6 months to scale heights.
  const maxMonthlyValue = useMemo(() => {
    let max = 100; // minimum scale threshold
    monthlyTrend.forEach((m) => {
      if (m.income > max) max = m.income;
      if (m.expense > max) max = m.expense;
    });
    return max;
  }, [monthlyTrend]);


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* --- KPI SCORECARD GRID --- */}
      <div className="summary-grid">
        <div className="card summary-card">
          <span className="summary-label">Total Balance</span>
          <span className="summary-value" style={{ color: kpis.totalBalance >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
            {kpis.totalBalance < 0 ? '-' : ''}{currencySymbol}{Math.abs(kpis.totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="summary-subtext">Net wealth available</span>
        </div>

        <div className="card summary-card income">
          <span className="summary-label">Total Income</span>
          <span className="summary-value text-income">
            +{currencySymbol}{kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="summary-subtext positive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
            Inflow funds
          </span>
        </div>

        <div className="card summary-card expense">
          <span className="summary-label">Total Expenses</span>
          <span className="summary-value text-expense">
            -{currencySymbol}{kpis.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="summary-subtext negative">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
            Outflow funds
          </span>
        </div>

        <div className="card summary-card savings">
          <span className="summary-label">Savings Rate</span>
          <span className="summary-value" style={{ color: 'var(--primary)' }}>{kpis.savingsRate}%</span>
          <span className="summary-subtext" style={{ color: kpis.savingsRate >= 20 ? 'var(--success)' : 'var(--text-secondary)' }}>
            {kpis.savingsRate >= 20 ? '🔥 Great saving habit!' : 'Target saving rate is >20%'}
          </span>
        </div>
      </div>

      {/* --- CHARTS GRID --- */}
      <div className="charts-grid">
        
        {/* --- EXPENSE BREAKDOWN (Clean CSS Progress Bars) --- */}
        <div className="card chart-card">
          <div className="chart-title-container">
            <h3 className="chart-title">Expense Breakdown</h3>
            <span className="badge badge-neutral">{currencySymbol}{expenseBreakdown.totalExpense.toLocaleString()} Total</span>
          </div>

          <div className="breakdown-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem', width: '100%' }}>
            {expenseBreakdown.data.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <p>No expense data available for this period</p>
              </div>
            ) : (
              expenseBreakdown.data.map((item) => (
                <div key={item.category} className="breakdown-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {/* Category Details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                      <span>{item.category}</span>
                    </div>
                    <div>
                      <span>{currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 500 }}>({item.percent}%)</span>
                    </div>
                  </div>
                  {/* HTML / CSS progress bar layout (simple to explain) */}
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${item.percent}%`, 
                        backgroundColor: item.color, 
                        borderRadius: '4px', 
                        transition: 'width 0.4s ease-out' 
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- INCOME VS EXPENSES (Clean CSS Flexbox Columns) --- */}
        <div className="card chart-card">
          <div className="chart-title-container">
            <h3 className="chart-title">Income vs Expenses</h3>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--success)' }} /> Income
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--danger)' }} /> Expenses
              </span>
            </div>
          </div>

          {/* Simple CSS-based bar chart (responsive and beginner friendly) */}
          <div 
            className="bar-chart-container" 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              alignItems: 'flex-end', 
              height: '220px', 
              marginTop: '1.5rem',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-color)',
              position: 'relative'
            }}
          >
            {monthlyTrend.map((data, idx) => {
              // Scale height percentage relative to the maximum value in the list
              const incomeHeight = maxMonthlyValue > 0 ? (data.income / maxMonthlyValue) * 100 : 0;
              const expenseHeight = maxMonthlyValue > 0 ? (data.expense / maxMonthlyValue) * 100 : 0;

              return (
                <div 
                  key={idx} 
                  className="chart-column" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    height: '100%', 
                    justifyContent: 'flex-end',
                    flexGrow: 1,
                    maxWidth: '60px'
                  }}
                >
                  {/* Bars side-by-side inside a flex wrapper */}
                  <div 
                    className="bars-wrapper" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      gap: '4px', 
                      height: '100%', 
                      width: '100%',
                      justifyContent: 'center',
                      paddingBottom: '8px'
                    }}
                  >
                    {/* Income Bar */}
                    <div 
                      className="trend-bar income-bar"
                      style={{ 
                        height: `${incomeHeight}%`, 
                        width: '12px', 
                        backgroundColor: 'var(--success)', 
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease-out'
                      }}
                      title={`Income: ${currencySymbol}${data.income.toLocaleString()}`}
                    />
                    {/* Expense Bar */}
                    <div 
                      className="trend-bar expense-bar"
                      style={{ 
                        height: `${expenseHeight}%`, 
                        width: '12px', 
                        backgroundColor: 'var(--danger)', 
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease-out'
                      }}
                      title={`Expenses: ${currencySymbol}${data.expense.toLocaleString()}`}
                    />
                  </div>

                  {/* Month Label */}
                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: 'var(--text-secondary)',
                      position: 'absolute',
                      bottom: '-15px'
                    }}
                  >
                    {data.monthName.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
