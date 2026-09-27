import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import { getErrorMessage } from '../api/errorMessage'

function Categories() {
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

  const deleteButtonStyle = {
    padding: '6px 12px',
    background: 'transparent',
    color: colors.danger,
    border: `1px solid ${colors.danger}66`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  }

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const [formError, setFormError] = useState('')

  const navigate = useNavigate()

  async function fetchCategories() {
    try {
      const response = await api.get('/categories/')
      setCategories(response.data)
    } catch (err) {
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  async function handleAddCategory(e) {
    e.preventDefault()
    setFormError('')
    try {
      await api.post('/categories/', { name, type })
      setName('')
      setType('expense')
      fetchCategories()
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to add category'))
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/categories/${id}`)
      fetchCategories()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete category'))
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
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '32px' }}>
        Categories
      </h1>

      <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button type="submit" style={primaryButtonStyle}>
          Add category
        </button>
      </form>

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
        Your categories
      </h2>

      {categories.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: '15px' }}>
          No categories yet. Add one above to start organizing your transactions.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderLeft: `3px solid ${cat.type === 'income' ? colors.income : colors.expense}`,
                borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{cat.name}</span>
                <span
                  style={{
                    fontSize: '12px',
                    color: cat.type === 'income' ? colors.income : colors.expense,
                    background:
                      cat.type === 'income' ? 'rgba(95,168,143,0.12)' : 'rgba(201,138,75,0.12)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {cat.type}
                </span>
              </div>
              <button onClick={() => handleDelete(cat.id)} style={deleteButtonStyle}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Categories