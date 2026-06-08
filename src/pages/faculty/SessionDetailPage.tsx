import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, closeSession } from '@/api/services'
import api from '@/api/client'
import type { Session, AttendanceRecord } from '@/types'

const SessionDetailPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [attendees, setAttendees] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Manual override state
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({ studentName: '', studentId: '' })
  const [markingManual, setMarkingManual] = useState(false)
  const [manualMessage, setManualMessage] = useState<{ text: string; success: boolean } | null>(null)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await getSession(sessionId)
      setSession(data)
      setAttendees(data.attendees)
    } catch {
      setError('Failed to load session details.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSession()
    const interval = setInterval(() => {
      if (session?.status === 'active') fetchSession()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchSession, session?.status])

  useEffect(() => {
    if (!session?.createdAt || session.status !== 'active') return
    const duration = (session as Session & { durationMinutes?: number }).durationMinutes
    if (!duration) return

    const tick = () => {
      const elapsed = (Date.now() - new Date(session.createdAt).getTime()) / 1000
      const remaining = duration * 60 - elapsed
      if (remaining <= 0) {
        setTimeRemaining(0)
        fetchSession()
      } else {
        setTimeRemaining(Math.floor(remaining))
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [session, fetchSession])

  const handleClose = async () => {
    if (!sessionId || !confirm('Are you sure you want to close this session?')) return
    setClosing(true)
    try {
      const updated = await closeSession(sessionId)
      setSession(updated)
    } catch {
      alert('Failed to close session. Please try again.')
    } finally {
      setClosing(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    if (!session) return
    const message = `📍 *Attendance Session*\n\n*Course:* ${session.courseName}\n*Code:* ${session.sessionCode}\n\nClick to submit your attendance:\n${session.sessionUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  // ── Manual override ──────────────────────────────────────────────────────
  const handleManualMark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionId) return
    setMarkingManual(true)
    setManualMessage(null)
    try {
      await api.post(`/sessions/${sessionId}/manual-attendance`, {
        studentName: manualForm.studentName,
        studentId:   manualForm.studentId,
      })
      setManualMessage({ text: `${manualForm.studentName} marked present.`, success: true })
      setManualForm({ studentName: '', studentId: '' })
      await fetchSession()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to mark attendance.'
      setManualMessage({ text: msg, success: false })
    } finally {
      setMarkingManual(false)
    }
  }

  const handleExportPDF = () => {
    if (!session) return

    const verified   = attendees.filter(a => a.verified)
    const unverified = attendees.filter(a => !a.verified)
    const late       = attendees.filter(a => (a as AttendanceRecord & { isLate?: boolean }).isLate)
    const manual     = attendees.filter(a => (a as AttendanceRecord & { isManual?: boolean }).isManual)

    const rows = attendees.map((a, i) => {
      const isLate   = (a as AttendanceRecord & { isLate?: boolean }).isLate
      const isManual = (a as AttendanceRecord & { isManual?: boolean }).isManual
      return `
        <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${a.studentName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${a.studentId}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">
            <span style="color:${a.verified ? '#16a34a' : '#dc2626'};font-weight:bold">
              ${a.verified ? '✓ Present' : '✗ Outside'}
            </span>
            ${isLate   ? '<span style="color:#d97706;font-size:11px;margin-left:4px">(Late)</span>' : ''}
            ${isManual ? '<span style="color:#6366f1;font-size:11px;margin-left:4px">(Manual)</span>' : ''}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${Math.round(a.distance)}m</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${new Date(a.submittedAt).toLocaleTimeString()}</td>
        </tr>
      `
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Attendance Report - ${session.courseName}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}
        h1{color:#1a3a6b;margin-bottom:4px}
        .subtitle{color:#666;margin-bottom:24px;font-size:14px}
        .stats{display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap}
        .stat{background:#f0f4ff;border-radius:8px;padding:12px 20px;text-align:center}
        .stat-num{font-size:28px;font-weight:bold;color:#1a3a6b}
        .stat-label{font-size:12px;color:#666;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#1a3a6b;color:white;padding:10px 12px;text-align:left}
        .footer{margin-top:32px;font-size:11px;color:#999;text-align:center}
      </style></head><body>
      <h1>University of Bamenda</h1>
      <h2 style="color:#1a3a6b;margin-top:4px">${session.courseName} — Attendance Report</h2>
      <div class="subtitle">
        Code: <strong>${session.sessionCode}</strong> &nbsp;|&nbsp;
        Date: <strong>${new Date(session.createdAt).toLocaleDateString()}</strong> &nbsp;|&nbsp;
        Status: <strong>${session.status.toUpperCase()}</strong>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-num">${attendees.length}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-num" style="color:#16a34a">${verified.length}</div><div class="stat-label">Verified</div></div>
        <div class="stat"><div class="stat-num" style="color:#dc2626">${unverified.length}</div><div class="stat-label">Outside</div></div>
        <div class="stat"><div class="stat-num" style="color:#d97706">${late.length}</div><div class="stat-label">Late</div></div>
        <div class="stat"><div class="stat-num" style="color:#6366f1">${manual.length}</div><div class="stat-label">Manual</div></div>
      </div>
      <table><thead><tr>
        <th>#</th><th>Full Name</th><th>Student ID</th>
        <th style="text-align:center">Status</th>
        <th style="text-align:center">Distance</th><th>Time</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">Generated by UBa GPS-Verified Attendance System &nbsp;|&nbsp; ${new Date().toLocaleString()}</div>
      </body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading session...</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error ?? 'Session not found.'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  const verifiedCount   = attendees.filter(a => a.verified).length
  const unverifiedCount = attendees.filter(a => !a.verified).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-primary-500 text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button onClick={() => navigate('/dashboard')} className="text-primary-200 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-tight">{session.courseName}</h1>
          <p className="text-primary-200 text-xs">{formatDate(session.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          session.status === 'active' ? 'bg-green-400 text-green-900' : 'bg-gray-300 text-gray-700'
        }`}>
          {session.status === 'active' ? 'Active' : 'Closed'}
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Session Code Card */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Session Code</p>
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono font-bold text-4xl text-primary-700 tracking-widest">
              {session.sessionCode}
            </span>
            {session.status === 'active' && (
              <button onClick={handleClose} disabled={closing}
                className="btn-secondary text-sm text-red-500 border-red-300 hover:bg-red-50 shrink-0">
                {closing ? 'Closing...' : 'Close Session'}
              </button>
            )}
          </div>

          {timeRemaining !== null && session.status === 'active' && (
            <div className={`mt-3 text-sm font-medium ${timeRemaining < 60 ? 'text-red-500' : 'text-gray-500'}`}>
              ⏱ Auto-closing in {formatCountdown(timeRemaining)}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium">Share via WhatsApp or copy URL</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <code className="text-xs text-gray-600 flex-1 truncate">{session.sessionUrl}</code>
              <button onClick={() => handleCopy(session.sessionUrl)}
                className="text-primary-500 text-xs font-semibold shrink-0 hover:text-primary-700">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Share via WhatsApp
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-primary-700">{attendees.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
            <p className="text-xs text-gray-400 mt-1">Verified</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-3xl font-bold text-red-400">{unverifiedCount}</p>
            <p className="text-xs text-gray-400 mt-1">Outside</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={handleExportPDF} className="flex-1 flex items-center justify-center gap-2 btn-secondary text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={() => { setShowManualForm(!showManualForm); setManualMessage(null) }}
            className="flex-1 flex items-center justify-center gap-2 btn-secondary text-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v16m8-8H4" />
            </svg>
            Mark Present
          </button>
        </div>

        {/* Manual override form */}
        {showManualForm && (
          <div className="card border-indigo-100 bg-indigo-50/50">
            <h3 className="text-sm font-semibold text-indigo-800 mb-1">Manual Attendance Override</h3>
            <p className="text-xs text-indigo-600 mb-4">
              Use this when a student's GPS fails or they have a legitimate reason for being absent from the geofence.
            </p>
            {manualMessage && (
              <div className={`text-sm rounded-lg px-3 py-2 mb-3 ${
                manualMessage.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {manualMessage.text}
              </div>
            )}
            <form onSubmit={handleManualMark} className="space-y-3">
              <input
                type="text"
                placeholder="Student full name"
                value={manualForm.studentName}
                onChange={(e) => setManualForm({ ...manualForm, studentName: e.target.value })}
                required
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder="Student ID (e.g. UBa/2021/CS/001)"
                value={manualForm.studentId}
                onChange={(e) => setManualForm({ ...manualForm, studentId: e.target.value })}
                required
                className="input-field text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowManualForm(false)}
                  className="btn-secondary flex-1 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={markingManual}
                  className="btn-primary flex-1 text-sm bg-indigo-600 hover:bg-indigo-700">
                  {markingManual ? 'Marking...' : 'Mark Present'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Attendees list */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-primary-900">Attendees</h2>
            {session.status === 'active' && (
              <span className="text-xs text-gray-400 animate-pulse">Auto-refreshing...</span>
            )}
          </div>

          {attendees.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No submissions yet. Waiting for students...
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {attendees.map((a) => {
                const isLate   = (a as AttendanceRecord & { isLate?: boolean }).isLate
                const isManual = (a as AttendanceRecord & { isManual?: boolean }).isManual
                return (
                  <div key={a.id} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${a.verified ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">{a.studentName}</p>
                          {isLate && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                              Late
                            </span>
                          )}
                          {isManual && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                              Manual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{a.studentId}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{formatTime(a.submittedAt)}</p>
                      <p className={`text-xs font-medium mt-0.5 ${a.verified ? 'text-green-600' : 'text-red-400'}`}>
                        {isManual ? 'Manually added' : a.verified ? `${Math.round(a.distance)}m away` : 'Outside geofence'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionDetailPage
