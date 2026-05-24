import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useGPS } from '@/hooks/useGPS'
import { submitAttendance } from '@/api/services'

type PageState = 'form' | 'success' | 'failed' | 'duplicate' | 'closed' | 'device_used'

// Generate a simple device fingerprint from browser properties
const getDeviceFingerprint = (): string => {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|')

  // Simple hash function
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const SubmitAttendancePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { coordinates, status: gpsStatus, error: gpsError, requestLocation } = useGPS()

  const [form, setForm] = useState({ studentName: '', studentId: '', sessionCode: '' })
  const [pageState, setPageState] = useState<PageState>('form')
  const [submitting, setSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [distance, setDistance] = useState<number | undefined>()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-request GPS on page load
  useEffect(() => {
    requestLocation()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isOffline) {
      alert('You are offline. Please connect to the internet and try again.')
      return
    }

    if (gpsStatus !== 'success' || !coordinates) {
      alert('Please allow location access before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const deviceFingerprint = getDeviceFingerprint()

      const res = await submitAttendance({
        studentName: form.studentName,
        studentId: form.studentId,
        sessionCode: form.sessionCode,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        deviceFingerprint,
      })

      setResultMessage(res.message)
      setDistance(res.distance)

      if (!res.success) {
        const msg = res.message.toLowerCase()
        if (msg.includes('already') || msg.includes('duplicate')) {
          setPageState('duplicate')
        } else if (msg.includes('closed')) {
          setPageState('closed')
        } else if (msg.includes('device')) {
          setPageState('device_used')
        } else {
          setPageState('failed')
        }
      } else if (!res.verified) {
        setPageState('failed')
      } else {
        setPageState('success')
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? null

      if (!msg) {
        // Network error — likely offline
        setResultMessage('Could not reach the server. Please check your internet connection and try again.')
        setPageState('failed')
        return
      }

      setResultMessage(msg)
      const lower = msg.toLowerCase()
      if (lower.includes('already') || lower.includes('duplicate')) {
        setPageState('duplicate')
      } else if (lower.includes('closed')) {
        setPageState('closed')
      } else if (lower.includes('device')) {
        setPageState('device_used')
      } else {
        setPageState('failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Attendance Recorded!</h1>
        <p className="text-green-600 text-sm mb-1">Your presence has been verified.</p>
        {distance !== undefined && (
          <p className="text-green-500 text-xs mt-1">You were {Math.round(distance)}m from the classroom centre</p>
        )}
        <div className="mt-6 bg-white rounded-xl px-6 py-4 shadow-sm border border-green-100">
          <p className="text-gray-500 text-xs">Signed in as</p>
          <p className="text-gray-800 font-semibold mt-0.5">{form.studentName}</p>
          <p className="text-gray-400 text-sm">{form.studentId}</p>
          <p className="text-gray-300 text-xs mt-2">{new Date().toLocaleString()}</p>
        </div>
        <p className="text-green-400 text-xs mt-8">University of Bamenda · GPS-Verified Attendance</p>
      </div>
    )
  }

  // ── Outside geofence ──────────────────────────────────────────────────────
  if (pageState === 'failed') {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-red-700 mb-2">
          {resultMessage.includes('internet') || resultMessage.includes('server')
            ? 'Connection Error'
            : 'Outside Allowed Area'}
        </h1>
        <p className="text-red-500 text-sm max-w-xs">{resultMessage}</p>
        {distance !== undefined && (
          <p className="text-red-400 text-xs mt-2">
            You are approximately {Math.round(distance)}m away (limit: 150m)
          </p>
        )}
        <button onClick={() => { setPageState('form'); setResultMessage('') }}
          className="mt-8 btn-primary bg-red-500 hover:bg-red-600">
          Try Again
        </button>
        <p className="text-red-300 text-xs mt-8">University of Bamenda · GPS-Verified Attendance</p>
      </div>
    )
  }

  // ── Duplicate ──────────────────────────────────────────────────────────────
  if (pageState === 'duplicate') {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-blue-700 mb-2">Already Submitted</h1>
        <p className="text-blue-500 text-sm">Attendance for this session has already been recorded for your student ID.</p>
        <p className="text-blue-400 text-xs mt-8">University of Bamenda · GPS-Verified Attendance</p>
      </div>
    )
  }

  // ── Device already used ────────────────────────────────────────────────────
  if (pageState === 'device_used') {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-orange-700 mb-2">Device Already Used</h1>
        <p className="text-orange-500 text-sm max-w-xs">{resultMessage}</p>
        <p className="text-orange-400 text-xs mt-4">Each device can only be used once per session.</p>
        <p className="text-orange-300 text-xs mt-8">University of Bamenda · GPS-Verified Attendance</p>
      </div>
    )
  }

  // ── Session closed ─────────────────────────────────────────────────────────
  if (pageState === 'closed') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-600 mb-2">Session Closed</h1>
        <p className="text-gray-400 text-sm">This attendance session is no longer accepting submissions.</p>
        <p className="text-gray-300 text-xs mt-8">University of Bamenda · GPS-Verified Attendance</p>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-primary-500 flex flex-col items-center justify-center px-4 py-10">

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-4">
          <svg className="w-8 h-8 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold">Submit Attendance</h1>
        <p className="text-primary-200 text-sm mt-1">University of Bamenda</p>
      </div>

      {/* Offline warning */}
      {isOffline && (
        <div className="w-full max-w-sm bg-red-500 text-white rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728" />
          </svg>
          <span>No internet connection. Please reconnect to submit.</span>
        </div>
      )}

      {/* GPS status */}
      <div className={`w-full max-w-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-3 text-sm ${
        gpsStatus === 'success' ? 'bg-green-500 text-white'
        : gpsStatus === 'requesting' ? 'bg-primary-400 text-white'
        : 'bg-red-500 text-white'
      }`}>
        {gpsStatus === 'success' ? (
          <>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Location acquired (±{Math.round(coordinates?.accuracy ?? 0)}m accuracy)</span>
          </>
        ) : gpsStatus === 'requesting' ? (
          <>
            <svg className="w-5 h-5 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Getting your location...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="font-semibold">Location required</p>
              <p className="text-xs opacity-90">{gpsError ?? 'Allow location access to continue'}</p>
            </div>
          </>
        )}
      </div>

      {(gpsStatus === 'denied' || gpsStatus === 'error') && (
        <button onClick={requestLocation} className="text-white text-sm underline mb-4">Try again</button>
      )}

      {gpsStatus !== 'success' && (
        <div className="w-full max-w-sm bg-primary-600 rounded-xl px-4 py-3 mb-4 text-primary-100 text-xs">
          <p className="font-semibold mb-1">Why do we need your location?</p>
          <p>This system uses GPS to confirm you are physically present in the classroom. Your exact location is only used for verification and is not stored beyond what is needed.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <h2 className="text-primary-900 text-lg font-bold mb-1">Your Details</h2>
        <p className="text-gray-400 text-sm mb-6">Enter your information to mark attendance</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" name="studentName" value={form.studentName}
              onChange={handleChange} placeholder="e.g. John Fon" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input type="text" name="studentId" value={form.studentId}
              onChange={handleChange} placeholder="e.g. UBa/2021/CS/001" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session code</label>
            <input type="text" name="sessionCode" value={form.sessionCode}
              onChange={handleChange} placeholder="6-digit code from lecturer"
              maxLength={6} required className="input-field font-mono tracking-widest text-center text-xl" />
          </div>

          <button type="submit"
            disabled={submitting || gpsStatus !== 'success' || isOffline}
            className="btn-primary w-full mt-2">
            {submitting ? 'Submitting...'
              : isOffline ? 'No Internet Connection'
              : gpsStatus !== 'success' ? 'Waiting for GPS...'
              : 'Submit Attendance'}
          </button>
        </form>
      </div>

      <p className="text-primary-300 text-xs mt-8 text-center">
        University of Bamenda · GPS-Verified Attendance System
      </p>
    </div>
  )
}

export default SubmitAttendancePage
