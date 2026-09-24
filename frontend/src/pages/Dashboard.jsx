import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await api.get('/transactions/')
        setTransactions(response.data)
      } catch (err) {
        setError('Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <button onClick={handleLogout}>Log Out</button>
      </div>
      <h2>Your Transactions</h2>
      {transactions.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <ul>
          {transactions.map((t) => (
            <li key={t.id}>
              {t.description} — ₹{t.amount} ({t.payment_mode})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Dashboard