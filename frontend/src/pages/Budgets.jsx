import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import { getErrorMessage } from '../api/errorMessage'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function Budgets() {
  const { colors } = useTheme()

  const inputStyle = {
    flex: 1,
    padding: '10px 12px',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
  }

  const selectStyle = { ...inputStyle, flex: 'none', cursor: 'pointer' }

  const primaryButtonStyle = {
    padding: '10px 18px',
    background: `linear-gradient(90deg, ${colors.accentPurple}, ${colors.accentBlue})`,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  const deleteButtonStyle = {
    padding: '6px 12px',
    background: 'transparent',
    color: colors.danger,
    border: `1px solid ${colors.danger}66`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  }

  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [limitAmount, setLimitAmount] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [categoryId, setCategoryId] = useState('')
  const [formError, setFormError] = useState('')

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  async function fetchData() {
    try {
      const [budgetRes, catRes, txRes] = await Promise.all([
        api.get('/budgets/'),
        api.get('/categories/'),
        api.get('/transactions/'),
      ])
      setBudgets(budgetRes.data)
      setCategories(catRes.data)
      setTransactions(txRes.data)
      const expenseCats = catRes.data.filter((c) => c.type === 'expense')
      if (expenseCats.length > 0 && !categoryId) {
        setCategoryId(expenseCats[0].id)
      }
    } catch (err) {
      setError('Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function getCategory(id) {
    return categories.find((c) => c.id === id)
  }

  function getSpent(budget) {
    return transactions
      .filter((t) => {
        const txMonth = t.date?.slice(0, 7)
        return t.category_id === budget.category_id && txMonth === budget.month
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }

  async function handleAddBudget(e) {
    e.preventDefault()
    setFormError('')

    if (!categoryId) {
      setFormError('Add an expense category first before setting a budget')
      return
    }

    try {
      await api.post('/budgets/', {
        limit_amount: parseFloat(limitAmount),
        month,
        category_id: parseInt(categoryId),
      })
      setLimitAmount('')
      fetchData()
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to add budget'))
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/budgets/${id}`)
      fetchData()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete budget'))
    }
  }

  if (loading) return <p style={{ color: colors.textMuted, padding: '24px' }}>Loading...</p>

  return (
    <div style={{ color: colors.text, fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Budgets
      </h1>

      {expenseCategories.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: '15px' }}>
          You need at least one expense category before setting a budget.
        </p>
      ) : (
        <form onSubmit={handleAddBudget} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={selectStyle}
          >
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Limit amount"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            required
            style={{ ...inputStyle, minWidth: '120px' }}
          />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ ...inputStyle, minWidth: '140px' }}
          />
          <button type="submit" style={primaryButtonStyle}>
            Set budget
          </button>
        </form>
      )}

      {formError && (
        <p style={{ color: colors.danger, fontSize: '14px', marginTop: '10px' }}>{formError}</p>
      )}
      {error && (
        <p style={{ color: colors.danger, fontSize: '14px', marginTop: '10px' }}>{error}</p>
      )}

      <h2
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: colors.textMuted,
          marginTop: '32px',
          marginBottom: '12px',
        }}
      >
        Your budgets
      </h2>

      {budgets.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: '15px' }}>No budgets set yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {budgets.map((b) => {
            const cat = getCategory(b.category_id)
            const spent = getSpent(b)
            const pct = Math.min(100, (spent / b.limit_amount) * 100)
            const overBudget = spent > b.limit_amount
            return (
              <div
                key={b.id}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '10px',
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>
                      {cat ? cat.name : 'Unknown category'}
                    </span>
                    <span style={{ fontSize: '13px', color: colors.textMuted, marginLeft: '10px' }}>
                      {b.month}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(b.id)} style={deleteButtonStyle}>
                    Delete
                  </button>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '999px',
                    background: colors.border,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: overBudget
                        ? colors.danger
                        : `linear-gradient(90deg, ${colors.accentPurple}, ${colors.accentBlue})`,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: overBudget ? colors.danger : colors.textMuted,
                    marginTop: '6px',
                  }}
                >
                  <span>
                    ₹{spent.toFixed(2)} / ₹{b.limit_amount.toFixed(2)}
                  </span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Budgets