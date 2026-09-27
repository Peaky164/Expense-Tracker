import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Budgets from './pages/Budgets'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
        <ThemeProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Layout>
              <Categories />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Layout>
              <Transactions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
  path="/budgets"
  element={
    <ProtectedRoute>
      <Layout>
        <Budgets />
      </Layout>
    </ProtectedRoute>
  }
/>
      <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
    </ThemeProvider>
  )
}
export default App