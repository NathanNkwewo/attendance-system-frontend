import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getCourses, createCourse, createSession } from '@/api/services'
import api from '@/api/client'
import type { Course, Session } from '@/types'

const DURATION_OPTIONS = [
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1 hr 15 mins', value: 75 },
  { label: '1 hr 30 mins', value: 90 },
  { label: '1 hr 45 mins', value: 105 },
  { label: '2 hours', value: 120 },
]

const DashboardPage = () => {
  const { faculty, logout } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create course modal
  const [showModal, setShowModal] = useState(false)
  const [courseForm, setCourseForm] = useState({ name: '', code: '' })
  const [creating, setCreating] = useState(false)
  const [courseError, setCourseError] = useState<string | null>(null)

  // Duration picker modal
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(45)

  // Session state
  const [startingSession, setStartingSession] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [locationStatus, setLocationStatus] = useState<string | null>(null)

  useEffect(() => { fetchCourses() }, [])

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

  const getFacultyLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject(new Error('Location access denied')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  // Step 1 — open duration picker
  const handleStartSessionClick = (courseId: string) => {
    setSelectedCourseId(courseId)
    setSelectedDuration(15)
    setShowDurationModal(true)
  }

  // Step 2 — confirm and start
  const handleConfirmSession = async () => {
    if (!selectedCourseId) return
    setShowDurationModal(false)
    setStartingSession(true)
    setLocationStatus('Getting your location...')

    try {
      const location = await getFacultyLocation()
      setLocationStatus('Location acquired. Starting session...')

      const session = await createSession({ courseId: selectedCourseId, durationMinutes: selectedDuration })

      await api.post(`/sessions/${session.id}/location`, {
        latitude: location.latitude,
        longitude: location.longitude,
      })

      setActiveSession(session)
      setLocationStatus(null)
    } catch (err: unknown) {
      const message = (err as Error).message ?? ''
      if (message.includes('Location') || message.includes('location')) {
        alert('Location access is required to start a session. Please allow location access and try again.')
      } else {
        alert('Failed to start session. Please try again.')
      }
      setLocationStatus(null)
    } finally {
      setStartingSession(false)
      setSelectedCourseId(null)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-primary-500 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary-900">My Courses</h1>
          <p className="text-gray-500 text-sm mt-1">Start a session to take attendance</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
        )}

        {locationStatus && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {locationStatus}
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
              <button onClick={() => navigate(`/sessions/${activeSession.id}`)}
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
                <button onClick={() => navigator.clipboard.writeText(activeSession.sessionUrl)}
                  className="text-green-700 hover:text-green-900 text-xs shrink-0 font-medium">
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-medium">No courses yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first course to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="card flex items-center justify-between gap-4">
                <div>
                  <span className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-0.5 rounded">
                    {course.code}
                  </span>
                  <h3 className="text-primary-900 font-semibold mt-1">{course.name}</h3>
                  <button onClick={() => navigate(`/courses/${course.id}/summary`)}
                    className="text-xs text-primary-400 hover:text-primary-600 mt-1 transition-colors">
                    View attendance summary →
                  </button>
                </div>
                <button
                  onClick={() => handleStartSessionClick(course.id)}
                  disabled={startingSession}
                  className="btn-primary shrink-0 text-sm">
                  {startingSession ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowModal(true)}
          className="mt-6 w-full border-2 border-dashed border-primary-200 hover:border-primary-400 text-primary-400 hover:text-primary-600 rounded-xl py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Course
        </button>
      </div>

      {/* Duration picker modal */}
      {showDurationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-primary-900 font-bold text-lg mb-1">Session Duration</h3>
            <p className="text-gray-400 text-sm mb-5">
              How long should this session stay open for student submissions?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedDuration(opt.value)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${
                    selectedDuration === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-primary-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-4 text-center">
              Session will auto-close after {selectedDuration} minutes
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowDurationModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleConfirmSession} className="btn-primary flex-1">
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Course modal */}
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
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
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
