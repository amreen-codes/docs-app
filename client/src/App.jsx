import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import Editor from './Editor'

const Guard = ({ children }) => (localStorage.getItem('token') ? children : <Navigate to="/login" replace />)

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Dashboard /></Guard>} />
      <Route path="/doc/:id" element={<Guard><Editor /></Guard>} />
    </Routes>
  )
}