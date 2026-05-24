import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAttendanceSummary } from '@/api/services'
import type { StudentAttendanceSummary } from '@/types'

const AttendanceSummaryPage = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<StudentAttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetch = async () => {
      if (!courseId) return
      try {
        const data = await getAttendanceSummary(courseId)
        setSummary(data)
      } catch {
        setError('Failed to load attendance summary.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [courseId])

  const filtered = summary.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase())
  )

  const atRisk = summary.filter((s) => s.belowThreshold).length
  const courseName = summary[0] ? undefined : null

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
        <div>
          <h1 className="font-bold text-lg leading-tight">Attendance Summary</h1>
          {courseName !== null && (
            <p className="text-primary-200 text-xs">Per-student breakdown</p>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* At-risk alert */}
        {atRisk > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-amber-700 text-sm">
              <span className="font-bold">{atRisk} student{atRisk > 1 ? 's' : ''}</span> below the 75% attendance threshold
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or student ID..."
            className="input-field pl-9"
          />
        </div>

        {/* Stats row */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center py-4">
              <p className="text-3xl font-bold text-primary-700">{summary.length}</p>
              <p className="text-xs text-gray-400 mt-1">Students</p>
            </div>
            <div className="card text-center py-4">
              <p className="text-3xl font-bold text-green-600">
                {summary.filter(s => !s.belowThreshold).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">On Track</p>
            </div>
            <div className="card text-center py-4">
              <p className="text-3xl font-bold text-amber-500">{atRisk}</p>
              <p className="text-xs text-gray-400 mt-1">At Risk</p>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading summary...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {search ? 'No students match your search.' : 'No attendance data yet.'}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="col-span-5">Student</div>
              <div className="col-span-3 text-center">Attended</div>
              <div className="col-span-4 text-right">Percentage</div>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map((s) => (
                <div key={s.studentId}
                  className={`grid grid-cols-12 px-4 py-4 items-center ${
                    s.belowThreshold ? 'bg-amber-50' : ''
                  }`}>
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.studentName}</p>
                    <p className="text-xs text-gray-400">{s.studentId}</p>
                  </div>
                  <div className="col-span-3 text-center">
                    <p className="text-sm text-gray-600">
                      {s.attended}/{s.totalSessions}
                    </p>
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-2">
                    {s.belowThreshold && (
                      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd" />
                      </svg>
                    )}
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        s.belowThreshold ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {s.percentage.toFixed(1)}%
                      </p>
                      {/* Mini progress bar */}
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.belowThreshold ? 'bg-amber-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${Math.min(s.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        {!loading && !error && summary.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-gray-400 justify-center pb-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> On track (≥75%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> At risk (&lt;75%)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceSummaryPage
