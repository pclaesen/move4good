'use client'
import { useEffect, useState } from 'react'

export default function Connection() {
  const [userId, setUserId] = useState('')
  const [deleteId, setDeleteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
        console.log('Data from users table:', data)
      } catch (err) {
        console.error('Failed to test connection:', err)
      }
    }

    testConnection()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId }),
      })
      
      const result = await response.json()
      if (result.error) {
        setMessage(`Error: ${result.error}`)
      } else {
        setMessage('User added successfully!')
        setUserId('')
        // Refresh the data display
        const getResponse = await fetch('/api/supabase')
        const { data } = await getResponse.json()
        console.log('Updated users table:', data)
      }
    } catch (err) {
      setMessage(`Failed to add user: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/supabase?id=${deleteId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      if (result.error) {
        setMessage(`Error: ${result.error}`)
      } else {
        setMessage('User deleted successfully!')
        setDeleteId('')
        // Refresh the data display
        const getResponse = await fetch('/api/supabase')
        const { data } = await getResponse.json()
        console.log('Updated users table:', data)
      }
    } catch (err) {
      setMessage(`Failed to delete user: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="connection-test">
      <p>Check console for connection status and data</p>
      
      <div className="grid gap-4 mt-4">
        {/* Add User Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <h3 className="font-bold">Add User</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID to add"
              className="px-4 py-2 border rounded"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>

        {/* Delete User Form */}
        <form onSubmit={handleDelete} className="space-y-2">
          <h3 className="font-bold">Delete User</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={deleteId}
              onChange={(e) => setDeleteId(e.target.value)}
              placeholder="Enter user ID to delete"
              className="px-4 py-2 border rounded"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </form>
      </div>
      
      {message && (
        <p className={`mt-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
