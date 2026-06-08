import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import api from '@/api/client'

interface SessionStat {
  id: string
  label: string
  sessionCode: string
  date: string
  status: string
  total: number
  verified: number
  late: number
  manual: number
}

interface AnalyticsData {
  courseId: string
  courseName: string
  courseCode: string
  sessions: SessionStat[]
}

const AnalyticsPage = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/courses/${courseId}/analytics`)
        setData(res.data)
      } catch {
        setError('Failed to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [courseId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error ?? 'No data found.'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const totalSessions  = data.sessions.length
  const avgAttendance  = totalSessions > 0
    ? Math.round(data.sessions.reduce((sum, s) => sum + s.verified, 0) / totalSessions)
    : 0
  const totalLate      = data.sessions.reduce((sum, s) => sum + s.late, 0)
  const totalManual    = data.sessions.reduce((sum, s) => sum + s.manual, 0)

  const chartData = data.sessions.map(s => ({
    name:     s.label,
    Verified: s.verified,
    Late:     s.late,
    Manual:   s.manual,
    Outside:  s.total - s.verified,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-primary-500 text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button onClick={() => navigate('/dashboard')}
          className="text-primary-200 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">Attendance Analytics</h1>
          <p className="text-primary-200 text-xs">
            {data.courseCode} — {data.courseName}
          </p>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-primary-700">{totalSessions}</p>
            <p className="text-xs text-gray-400 mt-1">Total Sessions</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-green-600">{avgAttendance}</p>
            <p className="text-xs text-gray-400 mt-1">Avg Attendance</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-amber-500">{totalLate}</p>
            <p className="text-xs text-gray-400 mt-1">Late Submissions</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-indigo-500">{totalManual}</p>
            <p className="text-xs text-gray-400 mt-1">Manual Overrides</p>
          </div>
        </div>

        {/* Bar chart */}
        {data.sessions.length === 0 ? (
          <div className="card text-center py-12 text-gray-400 text-sm">
            No sessions yet for this course.
          </div>
        ) : (
          <div className="card">
            <h2 className="font-semibold text-primary-900 mb-4">Attendance per Session</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Verified" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="Late"     fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Manual"   fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="Outside"  fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session table */}
        {data.sessions.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-primary-900">Session Breakdown</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {data.sessions.map((s) => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{s.label}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        s.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.date).toLocaleDateString([], {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    <p className="text-green-600 font-medium">{s.verified} verified</p>
                    {s.late   > 0 && <p className="text-amber-500">{s.late} late</p>}
                    {s.manual > 0 && <p className="text-indigo-500">{s.manual} manual</p>}
                    <p className="text-gray-400">{s.total} total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyticsPage
