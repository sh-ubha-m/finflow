import React, { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import type { Transaction, TransactionType, TransactionCategory } from '../types';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id'>) => void;
  editingTransaction: Transaction | null;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingTransaction,
}) => {
  // --- STATE INITIALIZATION ---
  // In standard React, if we key this component in the parent (e.g. key={editingTransaction?.id || 'new'}),
  // React unmounts and remounts this component whenever the editing target changes.
  // This lets us initialize form state directly from props, avoiding complex reset code.
  const [title, setTitle] = useState(editingTransaction?.title || '');
  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : '');
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'expense');
  const [category, setCategory] = useState<TransactionCategory>(
    editingTransaction?.category || (editingTransaction?.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  );
  const [date, setDate] = useState(editingTransaction?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(editingTransaction?.description || '');

  // --- KEYBOARD LISTENERS ---
  // Close the modal when the "Escape" key is pressed.
  // This is placed before any early returns to strictly obey the Rules of Hooks (hooks must run in the exact same order).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // --- EARLY RETURN ---
  // If the modal is set to closed, render nothing.
  // Place this *after* all hooks to avoid conditional hook execution.
  if (!isOpen) return null;

  // --- EVENT HANDLERS ---
  // Handle submission of the HTML Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Stop page reload

    // Basic Validation Check
    if (!title.trim() || !amount || parseFloat(amount) <= 0 || !date || !category) {
      alert('Please fill out all fields with valid data.');
      return;
    }

    // Pass the clean data up to the parent component
    onSubmit({
      title: title.trim(),
      amount: parseFloat(amount),
      type,
      category,
      date,
      description: description.trim(),
    });

    onClose(); // Close the modal
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content animate-scale-in" 
        onClick={(e) => e.stopPropagation()} // Prevents closing the modal when clicking inside it
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="modal-title" style={{ fontSize: '1.25rem' }}>
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="btn btn-secondary btn-icon-only"
            style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer' }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Title Input */}
            <div className="form-group">
              <label htmlFor="tx-title">Title</label>
              <input
                id="tx-title"
                type="text"
                className="form-control"
                placeholder="e.g. Grocery store, Monthly salary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={50}
              />
            </div>

            {/* Amount and Type Row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tx-amount">Amount ($)</label>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tx-type">Type</label>
                <select
                  id="tx-type"
                  className="form-control"
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as TransactionType;
                    setType(newType);
                    // Instead of a useEffect side-effect, we update the category dropdown selection 
                    // directly in this event handler to keep state updates predictable and simple.
                    setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            {/* Date and Category Row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tx-date">Date</label>
                <input
                  id="tx-date"
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tx-category">Category</label>
                <select
                  id="tx-category"
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                >
                  {type === 'expense'
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

            {/* Description Textarea */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tx-desc">Description (Optional)</label>
              <textarea
                id="tx-desc"
                className="form-control"
                placeholder="Details or notes..."
                rows={3}
                style={{ resize: 'vertical', minHeight: '60px' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTransaction ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
