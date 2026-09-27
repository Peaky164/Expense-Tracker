import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import api from '../api/axios'

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Categories', path: '/categories' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Budgets', path: '/budgets' },
]

const MOBILE_BREAKPOINT = 768

function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { colors, mode, toggleTheme } = useTheme()

  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    async function fetchAlertData() {
      try {
        const [budgetRes, catRes, txRes] = await Promise.all([
          api.get('/budgets/'),
          api.get('/categories/'),
          api.get('/transactions/'),
        ])
        setBudgets(budgetRes.data)
        setCategories(catRes.data)
        setTransactions(txRes.data)
      } catch (err) {
        // Silently ignore here; each page already surfaces its own load errors.
      }
    }
    fetchAlertData()
  }, [location.pathname])

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

  const alerts = budgets
    .map((b) => {
      const cat = getCategory(b.category_id)
      const spent = getSpent(b)
      return { budget: b, category: cat, spent }
    })
    .filter((item) => item.spent > item.budget.limit_amount)

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const sidebarContent = (
    <>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '32px',
          backgroundImage: `linear-gradient(90deg, ${colors.accentPurple}, ${colors.accentBlue})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Expense Tracker
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                color: active ? colors.text : colors.textMuted,
                background: active
                  ? `linear-gradient(90deg, ${colors.accentPurple}33, ${colors.accentBlue}22)`
                  : 'transparent',
                borderLeft: active ? `3px solid ${colors.accentPurple}` : '3px solid transparent',
              }}
            >
              {item.label}
            </div>
          )
        })}
      </nav>

      <div
        onClick={toggleTheme}
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: colors.textMuted,
          cursor: 'pointer',
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span>{mode === 'dark' ? '☀️' : '🌙'}</span>
        {mode === 'dark' ? 'Light mode' : 'Dark mode'}
      </div>

      <div
        onClick={handleLogout}
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '14px',
          color: colors.danger,
          cursor: 'pointer',
          border: `1px solid ${colors.danger}55`,
          textAlign: 'center',
        }}
      >
        Log Out
      </div>
    </>
  )

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 30,
              }}
            />
          )}
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '220px',
              background: colors.sidebarBg,
              borderRight: `1px solid ${colors.border}`,
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 40,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.25s ease',
            }}
          >
            {sidebarContent}
          </aside>
        </>
      ) : (
        <aside
          style={{
            width: '220px',
            flexShrink: 0,
            background: colors.sidebarBg,
            borderRight: `1px solid ${colors.border}`,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {sidebarContent}
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            display: 'flex',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            alignItems: 'center',
            padding: isMobile ? '14px 16px' : '16px 24px',
            borderBottom: `1px solid ${colors.border}`,
            position: 'relative',
          }}
        >
          {isMobile && (
            <div
              onClick={() => setSidebarOpen(true)}
              style={{
                cursor: 'pointer',
                fontSize: '20px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.surface,
              }}
            >
              ☰
            </div>
          )}

          <div
            onClick={() => setShowNotifications((prev) => !prev)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.surface,
            }}
          >
            🔔
            {alerts.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: colors.danger,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '999px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {alerts.length}
              </span>
            )}
          </div>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '56px',
                right: isMobile ? '16px' : '24px',
                width: isMobile ? 'calc(100vw - 32px)' : '320px',
                maxWidth: '320px',
                maxHeight: '360px',
                overflowY: 'auto',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                zIndex: 20,
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: colors.text }}>
                Budget alerts
              </div>
              {alerts.length === 0 ? (
                <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                  No budgets are over their limit right now.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alerts.map(({ budget, category, spent }) => (
                    <div
                      key={budget.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: `${colors.danger}15`,
                        border: `1px solid ${colors.danger}44`,
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ color: colors.danger, fontWeight: 600, marginBottom: '2px' }}>
                        You've exceeded your {category ? category.name : 'Unknown'} budget
                      </div>
                      <div style={{ color: colors.textMuted }}>
                        ₹{spent.toFixed(2)} spent of ₹{budget.limit_amount.toFixed(2)} for {budget.month}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        <main
          style={{
            flex: 1,
            padding: isMobile ? '20px 16px' : '40px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout