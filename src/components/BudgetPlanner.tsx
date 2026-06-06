import React, { useState, useMemo } from 'react';
import { EXPENSE_CATEGORIES } from '../types';
import type { Transaction, Budget, ExpenseCategory } from '../types';

interface BudgetPlannerProps {
  transactions: Transaction[];
  budgets: Budget[];
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (category: ExpenseCategory) => void;
  currencySymbol: string;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  transactions,
  budgets,
  onSaveBudget,
  onDeleteBudget,
  currencySymbol,
}) => {
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState('');

  // 1. Calculate spending per category for the current calendar month
  const currentMonthExpenses = useMemo(() => {
    const expensesMap: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;
    
    // Initialize
    EXPENSE_CATEGORIES.forEach((cat) => {
      expensesMap[cat] = 0;
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        const tDate = new Date(t.date);
        if (
          !isNaN(tDate.getTime()) &&
          tDate.getFullYear() === currentYear &&
          tDate.getMonth() === currentMonth
        ) {
          expensesMap[t.category as ExpenseCategory] += t.amount;
        }
      }
    });

    return expensesMap;
  }, [transactions]);

  // Create a fast lookup for budgets
  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach((b) => {
      map[b.category] = b.limit;
    });
    return map;
  }, [budgets]);

  // Open editor for a category
  const startEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setBudgetLimitInput(budgetMap[category] ? String(budgetMap[category]) : '');
  };

  // Save budget
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !budgetLimitInput || parseFloat(budgetLimitInput) <= 0) {
      alert('Please enter a valid positive budget amount.');
      return;
    }

    onSaveBudget({
      category: editingCategory,
      limit: parseFloat(budgetLimitInput),
    });

    setEditingCategory(null);
    setBudgetLimitInput('');
  };

  // Total budgets vs Total spending for current month
  const totals = useMemo(() => {
    let totalBudgets = 0;
    let totalSpentInBudgetedCategories = 0;
    let totalMonthExpenses = 0;

    // Sum overall monthly expenses
    Object.values(currentMonthExpenses).forEach((amt) => {
      totalMonthExpenses += amt;
    });

    budgets.forEach((b) => {
      totalBudgets += b.limit;
      totalSpentInBudgetedCategories += currentMonthExpenses[b.category] || 0;
    });

    const totalPercentage = totalBudgets > 0 ? (totalSpentInBudgetedCategories / totalBudgets) * 100 : 0;

    return {
      totalBudgets,
      totalSpentInBudgetedCategories,
      totalMonthExpenses,
      percentage: Math.min(100, totalPercentage),
      rawPercentage: totalPercentage,
    };
  }, [budgets, currentMonthExpenses]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overall Budget Status */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 className="chart-title">Current Month Budget Overview</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Budget Set:</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              {currencySymbol}{totals.totalBudgets.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Spent in Budgeted Categories:</span>
            <div 
              style={{ 
                fontSize: '1.25rem', 
                fontWeight: 700, 
                color: totals.rawPercentage >= 100 ? 'var(--danger)' : totals.rawPercentage >= 80 ? 'var(--warning)' : 'var(--text-primary)' 
              }}
            >
              {currencySymbol}{totals.totalSpentInBudgetedCategories.toLocaleString()} ({totals.rawPercentage.toFixed(0)}%)
            </div>
          </div>
        </div>

        {totals.totalBudgets > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="budget-bar-container">
              <div 
                className="budget-bar-fill"
                style={{ 
                  width: `${totals.percentage}%`,
                  backgroundColor: totals.rawPercentage >= 100 ? 'var(--danger)' : totals.rawPercentage >= 75 ? 'var(--warning)' : 'var(--success)'
                }}
              />
            </div>
            {totals.rawPercentage >= 100 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                ⚠️ You have exceeded your overall set budget for this month!
              </span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No category budgets have been set yet. Define budgets below to monitor your monthly spending goals.
          </p>
        )}
      </div>

      {/* Categories Grid */}
      <div>
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>Category Budget Allocations</h3>
        <div className="budget-grid">
          {EXPENSE_CATEGORIES.map((cat) => {
            const limit = budgetMap[cat];
            const spent = currentMonthExpenses[cat] || 0;
            const isEditing = editingCategory === cat;
            const hasBudget = limit !== undefined;
            
            const percent = hasBudget ? (spent / limit) * 100 : 0;
            const isOverBudget = hasBudget && spent > limit;
            const isNearBudget = hasBudget && spent >= limit * 0.75 && spent <= limit;

            return (
              <div key={cat} className="card budget-card" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="budget-meta">
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{cat}</span>
                    {hasBudget && (
                      <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)' }}>
                        {currencySymbol}{limit.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div style={{ margin: '0.75rem 0' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Spend this month: <b>{currencySymbol}{spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                    </div>

                    {hasBudget && (
                      <div className="budget-bar-container">
                        <div 
                          className={`budget-bar-fill ${isOverBudget ? 'pulse-danger' : ''}`}
                          style={{ 
                            width: `${Math.min(100, percent)}%`,
                            backgroundColor: isOverBudget ? 'var(--danger)' : isNearBudget ? 'var(--warning)' : 'var(--success)'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Warning Alerts */}
                  {hasBudget && (
                    <div style={{ minHeight: '1.25rem', fontSize: '0.75rem' }}>
                      {isOverBudget && (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          ⚠️ Over budget by {currencySymbol}{(spent - limit).toLocaleString(undefined, { minimumFractionDigits: 2 })}!
                        </span>
                      )}
                      {isNearBudget && (
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                          ⚠️ Approaching limit ({percent.toFixed(0)}% used)
                        </span>
                      )}
                      {hasBudget && !isOverBudget && !isNearBudget && (
                        <span style={{ color: 'var(--success)' }}>
                          Budget secure ({percent.toFixed(0)}% used)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Panel */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  {isEditing ? (
                    <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        placeholder={`Limit (${currencySymbol})`}
                        className="form-control"
                        style={{ flexGrow: 1, padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                        value={budgetLimitInput}
                        onChange={(e) => setBudgetLimitInput(e.target.value)}
                        required
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
                        Save
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => setEditingCategory(null)}
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', width: hasBudget ? 'auto' : '100%' }}
                        onClick={() => startEdit(cat)}
                      >
                        {hasBudget ? 'Modify Limit' : 'Define Budget'}
                      </button>

                      {hasBudget && (
                        <button
                          className="btn btn-danger-outline btn-icon-only"
                          style={{ width: '28px', height: '28px', padding: 0 }}
                          onClick={() => {
                            if (confirm(`Remove budget for "${cat}"?`)) {
                              onDeleteBudget(cat);
                            }
                          }}
                          title="Remove budget limit"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
