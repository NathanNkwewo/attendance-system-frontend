// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Faculty {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  faculty: Faculty
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export interface Course {
  id: string
  name: string
  code: string
  facultyId: string
  createdAt: string
}

export interface CreateCoursePayload {
  name: string
  code: string
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'closed'

export interface Session {
  id: string
  courseId: string
  courseName: string
  sessionCode: string
  sessionUrl: string
  status: SessionStatus
  createdAt: string
  closedAt?: string
}

export interface CreateSessionPayload {
  courseId: string
  durationMinutes?: number
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string
  sessionId: string
  studentName: string
  studentId: string
  latitude: number
  longitude: number
  distance: number
  verified: boolean
  submittedAt: string
}

export interface AttendanceSubmitPayload {
  studentName: string
  studentId: string
  sessionCode: string
  latitude: number
  longitude: number
  deviceFingerprint?: string
}

export interface AttendanceSubmitResponse {
  success: boolean
  message: string
  verified: boolean
  distance?: number
}

// ─── Attendance Summary ───────────────────────────────────────────────────────

export interface StudentAttendanceSummary {
  studentId: string
  studentName: string
  totalSessions: number
  attended: number
  percentage: number
  belowThreshold: boolean
}

// ─── GPS ──────────────────────────────────────────────────────────────────────

export interface GPSCoordinates {
  latitude: number
  longitude: number
  accuracy: number
}

export type GPSStatus = 'idle' | 'requesting' | 'success' | 'error' | 'denied'

// ─── API Generic ──────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  statusCode: number
}
