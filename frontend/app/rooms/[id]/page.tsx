'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface Room {
  id: number
  room_number: string
  room_type: string
  bed_configuration: string
  max_occupancy: number
  base_price: number
  status: string
  floor_number: number
  has_wifi: boolean
  has_tv: boolean
  has_ac: boolean
  has_refrigerator: boolean
  has_mini_bar: boolean
  has_safe: boolean
  has_balcony: boolean
  has_bathtub: boolean
  notes?: string
  custom_room_type?: string
  created_at: string
  updated_at: string
}

interface RecentBooking {
  id: number
  guest_name: string
  check_in_date: string
  check_out_date: string
  status: string
  guest_phone?: string
  guest_email?: string
}

export default function RoomDetailPage() {
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails()
      fetchRecentBookings()
    }
  }, [roomId])

  const fetchRoomDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch room details')
      }

      const data = await response.json()
      setRoom(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentBookings = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}/bookings?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentBookings(data.bookings || [])
      }
    } catch (err) {
      console.error('Failed to fetch recent bookings:', err)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!room) return

    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...room,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update room status')
      }

      const updatedRoom = await response.json()
      setRoom(updatedRoom)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update room status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete room')
      }

      router.push('/rooms')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room')
    }
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    if (normalizedStatus === 'active' || normalizedStatus === 'available') {
      return 'bg-green-100 text-green-800'
    }
    if (normalizedStatus === 'under maintenance' || normalizedStatus === 'maintenance') {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (normalizedStatus === 'inactive' || normalizedStatus === 'out_of_order') {
      return 'bg-red-100 text-red-800'
    }
    if (normalizedStatus === 'occupied') {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested room could not be found.'}</p>
          <Link
            href="/rooms"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            ← Back to Rooms
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/rooms"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Room {room.room_number}</h1>
              <p className="text-gray-600 mt-1 capitalize">{room.room_type.replace('_', ' ')}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadge(room.status)}`}>
              {room.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <Link
              href={`/rooms/${room.id}/edit`}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Edit Room
            </Link>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Delete Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Details */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Number</label>
                  <p className="text-lg font-semibold text-gray-900">{room.room_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Type</label>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{room.room_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bed Configuration</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {room.bed_configuration || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Maximum Occupancy</label>
                  <p className="text-lg font-semibold text-gray-900">{room.max_occupancy} guests</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Price</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(room.base_price)}/night</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Floor</label>
                  <p className="text-lg font-semibold text-gray-900">{room.floor_number || 'N/A'}</p>
                </div>
              </div>

              {room.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-gray-900">{room.notes}</p>
                </div>
              )}
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'has_wifi', label: 'WiFi', icon: '📶' },
                  { key: 'has_tv', label: 'TV', icon: '📺' },
                  { key: 'has_ac', label: 'Air Conditioning', icon: '❄️' },
                  { key: 'has_refrigerator', label: 'Refrigerator', icon: '🧊' },
                  { key: 'has_mini_bar', label: 'Mini Bar', icon: '🍸' },
                  { key: 'has_safe', label: 'Safe', icon: '🔒' },
                  { key: 'has_balcony', label: 'Balcony', icon: '🌿' },
                  { key: 'has_bathtub', label: 'Bathtub', icon: '🛁' },
                ].map(amenity => (
                  <div
                    key={amenity.key}
                    className={`flex items-center p-3 rounded-lg ${
                      room[amenity.key as keyof Room]
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span className="text-xl mr-3">{amenity.icon}</span>
                    <span className="text-sm font-medium">{amenity.label}</span>
                    {room[amenity.key as keyof Room] && (
                      <svg className="w-4 h-4 ml-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Bookings</h2>
              {recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {recentBookings.map(booking => (
                    <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
                          <p className="text-gray-600 text-sm">
                            {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                          </p>
                          {booking.guest_phone && (
                            <p className="text-gray-600 text-sm">📞 {booking.guest_phone}</p>
                          )}
                          {booking.guest_email && (
                            <p className="text-gray-600 text-sm">✉️ {booking.guest_email}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No recent bookings for this room.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={room.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <Link
                  href={`/bookings/new?room=${room.id}`}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-center block transition-colors"
                >
                  Create Booking
                </Link>

                <Link
                  href={`/rooms/${room.id}/edit`}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-center block transition-colors"
                >
                  Edit Details
                </Link>
              </div>
            </div>

            {/* Room Information */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Created</label>
                  <p className="text-gray-600">{formatDateTime(room.created_at)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Last Updated</label>
                  <p className="text-gray-600">{formatDateTime(room.updated_at)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Room ID</label>
                  <p className="text-gray-600 font-mono">#{room.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}