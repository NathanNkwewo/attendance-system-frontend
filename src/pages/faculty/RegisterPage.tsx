import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { register } from '@/api/services'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await register({ name: form.name, email: form.email, password: form.password })
      setAuth(data.token, data.faculty)
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-500 flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-4">
          <svg className="w-8 h-8 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-wide">UBa Attendance</h1>
        <p className="text-primary-200 text-sm mt-1">Faculty Portal</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <h2 className="text-primary-900 text-xl font-bold mb-1">Create your account</h2>
        <p className="text-gray-500 text-sm mb-6">Register to start managing attendance sessions</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange}
              placeholder="Dr. John Doe" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="you@example.com" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange}
              placeholder="Min. 6 characters" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange}
              placeholder="Repeat password" required className="input-field" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      <p className="text-primary-300 text-xs mt-8 text-center">
        University of Bamenda · GPS-Verified Attendance System
      </p>
    </div>
  )
}

export default RegisterPage
