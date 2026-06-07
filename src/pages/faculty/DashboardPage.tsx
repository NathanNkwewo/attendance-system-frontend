import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getCourses, createCourse, createSession } from '@/api/services'
import type { Course, Session } from '@/types'

const DashboardPage = () => {
  const { faculty, logout } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create course modal state
  const [showModal, setShowModal] = useState(false)
  const [courseForm, setCourseForm] = useState({ name: '', code: '' })
  const [creating, setCreating] = useState(false)
  const [courseError, setCourseError] = useState<string | null>(null)

  // Active session tracking per course
  const [startingSession, setStartingSession] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const data = await getCourses()
      setCourses(data)
    } catch {
      setError('Failed to load courses. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCourseError(null)
    try {
      const newCourse = await createCourse(courseForm)
      setCourses([...courses, newCourse])
      setCourseForm({ name: '', code: '' })
      setShowModal(false)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create course.'
      setCourseError(message)
    } finally {
      setCreating(false)
    }
  }

  const handleStartSession = async (courseId: string) => {
    setStartingSession(courseId)
    try {
      const session = await createSession({ courseId })
      setActiveSession(session)
    } catch {
      alert('Failed to start session. Please try again.')
    } finally {
      setStartingSession(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top navbar */}
      <nav className="bg-primary-500 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-bold text-lg">UBa Attendance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-primary-200 text-sm hidden sm:block">{faculty?.name}</span>
          <button onClick={handleLogout}
            className="text-sm bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-900">My Courses</h1>
          <p className="text-gray-500 text-sm mt-1">Start a session to take attendance</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Active session banner */}
        {activeSession && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-green-800 font-semibold text-sm">Session Active</p>
                <p className="text-green-700 text-sm mt-0.5">{activeSession.courseName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 font-mono font-bold text-lg px-3 py-1 rounded-lg">
                    {activeSession.sessionCode}
                  </span>
                  <span className="text-green-600 text-xs">Share this code with students</span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/sessions/${activeSession.id}`)}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors shrink-0">
                View
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-green-600 text-xs font-medium mb-1">Session URL (share via WhatsApp):</p>
              <div className="flex items-center gap-2">
                <code className="text-green-700 text-xs bg-green-100 px-2 py-1 rounded flex-1 truncate">
                  {activeSession.sessionUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(activeSession.sessionUrl)}
                  className="text-green-700 hover:text-green-900 text-xs shrink-0 font-medium">
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No courses yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first course to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="card flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                  </div>
                  <h3 className="text-primary-900 font-semibold mt-1">{course.name}</h3>
                  <button
                    onClick={() => navigate(`/courses/${course.id}/summary`)}
                    className="text-xs text-primary-400 hover:text-primary-600 mt-1 transition-colors">
                    View attendance summary →
                  </button>
                </div>
                <button
                  onClick={() => handleStartSession(course.id)}
                  disabled={startingSession === course.id}
                  className="btn-primary shrink-0 text-sm">
                  {startingSession === course.id ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add course button */}
        <button
          onClick={() => setShowModal(true)}
          className="mt-6 w-full border-2 border-dashed border-primary-200 hover:border-primary-400 text-primary-400 hover:text-primary-600 rounded-xl py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Course
        </button>
      </div>

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-primary-900 font-bold text-lg mb-4">New Course</h3>

            {courseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                {courseError}
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course name</label>
                <input type="text" value={courseForm.name} required
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Software Engineering" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course code</label>
                <input type="text" value={courseForm.code} required
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  placeholder="e.g. CSC401" className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
