import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'

function Transactions() {
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
    background: colors.text,
    color: colors.bg,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  const ghostButtonStyle = {
    padding: '8px 14px',
    background: 'transparent',
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
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

  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [formError, setFormError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterType, setFilterType] = useState('')

  const navigate = useNavigate()

  async function fetchData() {
    try {
      const [txRes, catRes] = await Promise.all([
        api.get('/transactions/'),
        api.get('/categories/'),
      ])
      setTransactions(txRes.data)
      setCategories(catRes.data)
      if (catRes.data.length > 0 && !categoryId) {
        setCategoryId(catRes.data[0].id)
      }
    } catch (err) {
      setError('Failed to load transactions')
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

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const cat = getCategory(t.category_id)
      if (filterCategoryId && String(t.category_id) !== String(filterCategoryId)) return false
      if (filterType && cat?.type !== filterType) return false
      if (searchText && !t.description?.toLowerCase().includes(searchText.toLowerCase())) return false
      return true
    })
  }, [transactions, categories, searchText, filterCategoryId, filterType])

  async function handleAddTransaction(e) {
    e.preventDefault()
    setFormError('')

    if (!categoryId) {
      setFormError('Add a category first before adding a transaction')
      return
    }

    try {
      await api.post('/transactions/', {
        amount: parseFloat(amount),
        description,
        payment_mode: paymentMode,
        category_id: parseInt(categoryId),
      })
      setAmount('')
      setDescription('')
      setPaymentMode('')
      fetchData()
    } catch (err) {
      setFormError('Failed to add transaction')
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/transactions/${id}`)
      fetchData()
    } catch (err) {
      setError('Failed to delete transaction')
    }
  }

  if (loading) return <p style={{ color: colors.textMuted, padding: '24px' }}>Loading...</p>

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '48px 24px',
        color: colors.text,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '32px' }}>
        Transactions
      </h1>

      {categories.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: '15px' }}>
          You need at least one category before adding a transaction.{' '}
          <span
            onClick={() => navigate('/categories')}
            style={{ color: colors.text, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Add one here
          </span>
          .
        </p>
      ) : (
        <form
          onSubmit={handleAddTransaction}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        >
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ ...inputStyle, minWidth: '100px' }}
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, minWidth: '140px' }}
          />
          <input
            type="text"
            placeholder="Payment mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            style={{ ...inputStyle, minWidth: '120px' }}
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={selectStyle}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </select>
          <button type="submit" style={primaryButtonStyle}>
            Add transaction
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
          marginTop: '40px',
          marginBottom: '12px',
        }}
      >
        Your transactions
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search description..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ ...inputStyle, minWidth: '160px' }}
        />
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          style={selectStyle}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        {(searchText || filterCategoryId || filterType) && (
          <button
            onClick={() => { setSearchText(''); setFilterCategoryId(''); setFilterType('') }}
            style={ghostButtonStyle}
          >
            Clear filters
          </button>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: '15px' }}>
          {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTransactions.map((t) => {
            const cat = getCategory(t.category_id)
            const isIncome = cat?.type === 'income'
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `3px solid ${isIncome ? colors.income : colors.expense}`,
                  borderRadius: '6px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>
                      {t.description || 'No description'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: isIncome ? colors.income : colors.expense,
                        background: isIncome
                          ? 'rgba(95,168,143,0.12)'
                          : 'rgba(201,138,75,0.12)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {cat ? cat.name : 'Unknown category'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>
                    ₹{t.amount} {t.payment_mode ? `· ${t.payment_mode}` : ''}
                  </div>
                </div>
                <button onClick={() => handleDelete(t.id)} style={deleteButtonStyle}>
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Transactions