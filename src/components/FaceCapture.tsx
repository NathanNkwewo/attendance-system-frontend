/**
 * FaceCapture.tsx
 *
 * Reusable face-api.js component used in two modes:
 *   - 'enrol'  → captures face descriptor and stores it via backend
 *   - 'verify' → captures live face and compares against stored descriptor
 *
 * Place model weights in /public/models/:
 *   ssd_mobilenetv1_model-*
 *   face_landmark_68_model-*
 *   face_recognition_model-*
 * Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const MODEL_URL = '/models'
const MATCH_THRESHOLD = 0.6
const MAX_ATTEMPTS = 3

interface FaceCaptureProps {
  mode: 'enrol' | 'verify'
  studentId: string
  onSuccess: () => void
  onFailure?: () => void
}

type CaptureStatus = 'loading' | 'ready' | 'capturing' | 'success' | 'error'

export default function FaceCapture({ mode, studentId, onSuccess, onFailure }: FaceCaptureProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('loading')
  const [message,  setMessage]  = useState('Loading face detection models...')
  const [attempts, setAttempts] = useState(0)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const initialise = useCallback(async () => {
    setCaptureStatus('loading')
    setMessage('Loading face detection models...')
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      setCaptureStatus('ready')
      setMessage(
        mode === 'enrol'
          ? 'Position your face in the oval, then tap Enrol Face.'
          : 'Look directly at the camera, then tap Verify Identity.'
      )
    } catch (err: unknown) {
      setCaptureStatus('error')
      const e = err as { name?: string }
      setMessage(
        e.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions and retry.'
          : 'Could not load models. Check your internet connection.'
      )
    }
  }, [mode])

  useEffect(() => {
    initialise()
    return () => stopCamera()
  }, [initialise])

  const handleCapture = async () => {
    if (captureStatus !== 'ready' || !videoRef.current) return

    setCaptureStatus('capturing')
    setMessage('Scanning your face...')

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setCaptureStatus('ready')
        setMessage('No face detected. Ensure good lighting and face the camera directly.')
        return
      }

      const descriptor = Array.from(detection.descriptor)

      if (mode === 'enrol') {
        const res = await fetch(`/api/face/enrol/${studentId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ descriptor }),
        })
        if (!res.ok) throw new Error('Enrolment failed. Please try again.')

        stopCamera()
        setCaptureStatus('success')
        setMessage('Face enrolled! Proceeding to verification...')
        setTimeout(() => onSuccess(), 1500)

      } else {
        // verify mode
        const res = await fetch(`/api/face/verify/${studentId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ descriptor }),
        })

        if (!res.ok) throw new Error('Verification request failed.')

        const { match } = await res.json()
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (match) {
          stopCamera()
          setCaptureStatus('success')
          setMessage('Identity confirmed!')
          setTimeout(() => onSuccess(), 1000)
        } else if (newAttempts >= MAX_ATTEMPTS) {
          stopCamera()
          setCaptureStatus('error')
          setMessage('Verification failed after 3 attempts.')
          onFailure?.()
        } else {
          setCaptureStatus('ready')
          const remaining = MAX_ATTEMPTS - newAttempts
          setMessage(`Face not recognised. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`)
        }
      }
    } catch (err: unknown) {
      setCaptureStatus('error')
      setMessage((err as Error).message || 'Something went wrong. Please retry.')
    }
  }

  // ── Border colour by status ──────────────────────────────────────────────
  const borderClass =
    captureStatus === 'success'   ? 'border-green-400' :
    captureStatus === 'error'     ? 'border-red-400'   :
    captureStatus === 'capturing' ? 'border-yellow-400' :
    captureStatus === 'ready'     ? 'border-primary-400' :
    'border-gray-300'

  const dotClass =
    captureStatus === 'success'   ? 'bg-green-400' :
    captureStatus === 'error'     ? 'bg-red-400'   :
    captureStatus === 'capturing' ? 'bg-yellow-400 animate-pulse' :
    captureStatus === 'ready'     ? 'bg-green-400 animate-pulse'  :
    'bg-gray-300'

  return (
    <div className="flex flex-col items-center w-full px-4">

      {/* Camera frame */}
      <div className={`relative w-64 h-52 rounded-2xl overflow-hidden border-4 ${borderClass} bg-gray-900 mb-3 transition-colors duration-300`}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Oval face guide overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 208">
          <defs>
            <mask id="oval-mask">
              <rect width="256" height="208" fill="white" />
              <ellipse cx="128" cy="104" rx="72" ry="88" fill="black" />
            </mask>
          </defs>
          <rect width="256" height="208" fill="rgba(0,0,0,0.35)" mask="url(#oval-mask)" />
          <ellipse
            cx="128" cy="104" rx="72" ry="88"
            fill="none"
            stroke={captureStatus === 'capturing' ? '#facc15' : captureStatus === 'success' ? '#4ade80' : '#60a5fa'}
            strokeWidth="2.5"
            strokeDasharray={captureStatus === 'capturing' ? '6 3' : undefined}
          />
        </svg>

        {/* Status indicator dot */}
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${dotClass}`} />
      </div>

      {/* Message */}
      <p className="text-sm text-center text-gray-500 mb-4 max-w-xs min-h-[40px] leading-relaxed">
        {message}
      </p>

      {/* Attempt dots — verify mode only */}
      {mode === 'verify' && attempts > 0 && (
        <div className="flex gap-2 mb-4">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < attempts ? 'bg-red-400' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}

      {/* Action button */}
      {captureStatus === 'ready' && (
        <button onClick={handleCapture} className="btn-primary w-full max-w-xs">
          {mode === 'enrol' ? '📷  Enrol Face' : '🔍  Verify Identity'}
        </button>
      )}

      {captureStatus === 'capturing' && (
        <button disabled className="btn-primary w-full max-w-xs opacity-50 cursor-not-allowed">
          Scanning...
        </button>
      )}

      {captureStatus === 'success' && (
        <div className="w-full max-w-xs bg-green-50 border border-green-200 text-green-700 text-sm text-center rounded-xl py-3 font-medium">
          ✓ {mode === 'enrol' ? 'Enrolled successfully' : 'Identity confirmed'}
        </div>
      )}

      {captureStatus === 'error' && (
        <button onClick={initialise} className="btn-secondary w-full max-w-xs">
          Retry
        </button>
      )}
    </div>
  )
}
