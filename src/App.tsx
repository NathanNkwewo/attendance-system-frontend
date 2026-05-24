import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import type { ReactNode } from 'react'

import LoginPage from '@/pages/faculty/LoginPage'
import RegisterPage from '@/pages/faculty/RegisterPage'
import DashboardPage from '@/pages/faculty/DashboardPage'
import SessionDetailPage from '@/pages/faculty/SessionDetailPage'
import AttendanceSummaryPage from '@/pages/faculty/AttendanceSummaryPage'
import SubmitAttendancePage from '@/pages/student/SubmitAttendancePage'

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Student attendance submission — accessed via shared URL */}
    <Route path="/attend/:sessionId" element={<SubmitAttendancePage />} />

    {/* Faculty — protected */}
    <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
    <Route path="/sessions/:sessionId" element={<PrivateRoute><SessionDetailPage /></PrivateRoute>} />
    <Route path="/courses/:courseId/summary" element={<PrivateRoute><AttendanceSummaryPage /></PrivateRoute>} />

    {/* Default */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
)

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
)

export default App
