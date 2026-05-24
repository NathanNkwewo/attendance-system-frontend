import api from './client'
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  Course,
  CreateCoursePayload,
  Session,
  CreateSessionPayload,
  AttendanceRecord,
  AttendanceSubmitPayload,
  AttendanceSubmitResponse,
  StudentAttendanceSummary,
} from '@/types'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', payload)
  return res.data
}

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register', payload)
  return res.data
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export const getCourses = async (): Promise<Course[]> => {
  const res = await api.get<Course[]>('/courses')
  return res.data
}

export const createCourse = async (payload: CreateCoursePayload): Promise<Course> => {
  const res = await api.post<Course>('/courses', payload)
  return res.data
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export const createSession = async (payload: CreateSessionPayload): Promise<Session> => {
  const res = await api.post<Session>('/sessions', payload)
  return res.data
}

export const closeSession = async (sessionId: string): Promise<Session> => {
  const res = await api.patch<Session>(`/sessions/${sessionId}/close`)
  return res.data
}

export const getSession = async (
  sessionId: string
): Promise<Session & { attendees: AttendanceRecord[] }> => {
  const res = await api.get(`/sessions/${sessionId}`)
  return res.data
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export const submitAttendance = async (
  payload: AttendanceSubmitPayload
): Promise<AttendanceSubmitResponse> => {
  const res = await api.post<AttendanceSubmitResponse>('/attendance/submit', payload)
  return res.data
}

// ─── Attendance Summary ───────────────────────────────────────────────────────

export const getAttendanceSummary = async (
  courseId: string
): Promise<StudentAttendanceSummary[]> => {
  const res = await api.get<StudentAttendanceSummary[]>(
    `/courses/${courseId}/attendance-summary`
  )
  return res.data
}
