'use client'
import { useEffect } from 'react'

export default function Connection() {
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/supabase')
        const { data, error } = await response.json()
        
        if (error) {
          console.error('Supabase connection error:', error)
          return
        }
        
        console.log('Supabase connection successful')
        console.log('Data from users2 table:', data)
      } catch (err) {
        console.error('Failed to test connection:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="connection-test">
      <p>Check console for connection status and data</p>
    </div>
  )
}
