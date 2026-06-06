import React, { useState, useMemo } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import type { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
}) => {
  // --- UI STATES FOR SEARCH, FILTER, AND SORT ---
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Combines income and expense categories into one array for the filter selector
  const allCategories = useMemo(() => {
    return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  }, []);

  // --- SORT TOGGLER HANDLER ---
  // Toggles sorting direction if clicking the same header, otherwise switches fields.
  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to newest/highest first
    }
  };

  // --- FILTERING AND SORTING ENGINE ---
  // Performs search matching, type checking, category filtering, and sorting in memory.
  // Memoized so it only recalculates when dependencies change.
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Text Search Filter (Matches Title or Description case-insensitively)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // 2. Transaction Type Filter (Income vs Expense)
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    // 3. Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // 4. In-Memory Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortField, sortDirection]);

  // Date formatter helper to display dates neatly
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="chart-title-container">
        <h3 className="chart-title">Transaction History</h3>
        <span className="badge badge-neutral">
          {filteredAndSortedTransactions.length} of {transactions.length} record(s)
        </span>
      </div>

      {/* FILTER & CONTROLS TOOLBAR */}
      <div className="filters-bar">
        <div className="filters-left">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Dropdown */}
          <select
            className="form-control"
            style={{ width: '130px' }}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'all' | 'income' | 'expense');
              setCategoryFilter('all'); // Reset category selection when changing types
            }}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Category Dropdown */}
          <select
            className="form-control"
            style={{ width: '180px' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {typeFilter === 'all'
              ? allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              : typeFilter === 'expense'
              ? EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              : INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* LEDGER DISPLAY TABLE */}
      {filteredAndSortedTransactions.length === 0 ? (
        <div className="empty-state" style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
          <p>No matching transactions found.</p>
          {transactions.length > 0 && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="transactions-table-wrapper">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Title</th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('date')}
                  title="Click to sort by date"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Date
                    {sortField === 'date' && (
                      <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th>Category</th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('amount')}
                  style={{ textAlign: 'right' }}
                  title="Click to sort by amount"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                    Amount
                    {sortField === 'amount' && (
                      <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{tx.title}</span>
                      {tx.description && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {tx.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{formatDate(tx.date)}</td>
                  <td>
                    <span className={`badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                      {tx.category}
                    </span>
                  </td>
                  <td 
                    className={tx.type === 'income' ? 'text-income' : 'text-expense'}
                    style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}
                  >
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      {/* Edit Trigger */}
                      <button
                        className="btn btn-secondary btn-icon-only"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        onClick={() => onEdit(tx)}
                        title="Edit transaction"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                        </svg>
                      </button>

                      {/* Delete Trigger */}
                      <button
                        className="btn btn-danger-outline btn-icon-only"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${tx.title}"?`)) {
                            onDelete(tx.id);
                          }
                        }}
                        title="Delete transaction"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
