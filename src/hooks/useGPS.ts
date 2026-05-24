import { useState, useCallback } from 'react'
import type { GPSCoordinates, GPSStatus } from '@/types'

interface UseGPSReturn {
  coordinates: GPSCoordinates | null
  status: GPSStatus
  error: string | null
  requestLocation: () => void
}

export const useGPS = (): UseGPSReturn => {
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null)
  const [status, setStatus] = useState<GPSStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Your browser does not support GPS location. Please use a modern mobile browser.')
      return
    }

    setStatus('requesting')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setStatus('success')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
          setError('Location access was denied. Please allow location access in your browser settings and try again.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('error')
          setError('Your location could not be determined. Please check your GPS signal and try again.')
        } else {
          setStatus('error')
          setError('Location request timed out. Please try again.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [])

  return { coordinates, status, error, requestLocation }
}
