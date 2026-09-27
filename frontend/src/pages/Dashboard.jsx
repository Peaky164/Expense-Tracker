import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const donutPalette = ['#8b5cf6', '#38bdf8', '#c084fc', '#f2708a', '#facc15', '#4ade80']

function Dashboard() {
  const { colors } = useTheme()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function cardStyle() {
    return {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '20px',
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [txRes, catRes] = await Promise.all([
          api.get('/transactions/'),
          api.get('/categories/'),
        ])
        setTransactions(txRes.data)
        setCategories(catRes.data)
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading)
    return <p style={{ color: colors.textMuted, padding: '24px' }}>Loading...</p>
  if (error)
    return <p style={{ color: colors.danger, padding: '24px' }}>{error}</p>

  function getCategory(id) {
    return categories.find((c) => c.id === id)
  }

  let totalIncome = 0
  let totalExpense = 0
  transactions.forEach((t) => {
    const cat = getCategory(t.category_id)
    if (cat?.type === 'income') totalIncome += t.amount
    else totalExpense += t.amount
  })
  const balance = totalIncome - totalExpense

  const categoryTotals = {}
  transactions.forEach((t) => {
    const cat = getCategory(t.category_id)
    if (cat?.type === 'expense') {
      categoryTotals[cat.name] = (categoryTotals[cat.name] || 0) + t.amount
    }
  })
  const donutData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }))

  const monthlyMap = {}
  transactions.forEach((t) => {
    const cat = getCategory(t.category_id)
    const month = new Date(t.date).toLocaleString('default', { month: 'short' })
    if (!monthlyMap[month]) monthlyMap[month] = { month, income: 0, expense: 0 }
    if (cat?.type === 'income') monthlyMap[month].income += t.amount
    else monthlyMap[month].expense += t.amount
  })
  const monthlyData = Object.values(monthlyMap)

  const summaryCards = [
    { label: 'Total Balance', value: balance, color: colors.income },
    { label: 'Total Income', value: totalIncome, color: '#4ade80' },
    { label: 'Total Expenses', value: totalExpense, color: colors.danger },
  ]

  return (
    <div style={{ color: colors.text, fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Dashboard
      </h1>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ ...cardStyle(), flex: '1', minWidth: '180px' }}>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>
              ₹{card.value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ ...cardStyle(), flex: '2', minWidth: '320px', height: '300px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
            Monthly Overview
          </div>
          {monthlyData.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: '14px' }}>Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={monthlyData}>
                <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke={colors.textMuted} fontSize={12} />
                <YAxis stroke={colors.textMuted} fontSize={12} />
                <Tooltip
                  contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                />
                <Line type="monotone" dataKey="income" stroke={colors.income} strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke={colors.expense} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ ...cardStyle(), flex: '1', minWidth: '260px', height: '300px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
            Expense by Category
          </div>
          {donutData.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: '14px' }}>No expenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={entry.name} fill={donutPalette[index % donutPalette.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={cardStyle()}>
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
          Recent Transactions
        </div>
        {transactions.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: '15px' }}>No transactions yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 6).map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 4px',
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <span style={{ fontSize: '14px' }}>{t.description || 'No description'}</span>
                <span style={{ fontSize: '14px', color: colors.textMuted }}>
                  ₹{t.amount} {t.payment_mode ? `· ${t.payment_mode}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard