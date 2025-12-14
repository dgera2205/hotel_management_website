'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface Room {
  id: number
  room_number: string
  room_type: string
  bed_configuration: string
  floor_number: number
  base_price: number
  max_occupancy: number
  status: string
  has_ac: boolean
  has_tv: boolean
  has_wifi: boolean
  has_balcony: boolean
  has_refrigerator: boolean
  has_mini_bar: boolean
  has_safe: boolean
  has_bathtub: boolean
  notes: string | null
  custom_room_type: string | null
  created_at: string
  updated_at: string
}

interface RoomSummary {
  total_rooms: number
  active_rooms: number
  inactive_rooms: number
  under_maintenance: number
  room_types: Record<string, number>
}

export default function RoomsPage() {
  const { token } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [summary, setSummary] = useState<RoomSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchRooms()
    fetchSummary()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rooms/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch rooms')
      }

      const data = await response.json()
      setRooms(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/rooms/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (err) {
      console.error('Failed to fetch room summary:', err)
    }
  }

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Are you sure you want to deactivate this room?')) {
      return
    }

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete room')
      }

      await fetchRooms()
      await fetchSummary()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room')
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.room_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    const matchesType = typeFilter === 'all' || room.room_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Under Maintenance': 'bg-yellow-100 text-yellow-800',
      'Inactive': 'bg-red-100 text-red-800',
    }

    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600 mt-2">Manage hotel rooms and their configurations</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            href="/rooms/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Room
          </Link>
        </div>
      </div>

      {/* Room Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-5a2 2 0 012-2h2a2 2 0 012 2v5" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_rooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{summary.active_rooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Maintenance</p>
                <p className="text-2xl font-bold text-gray-900">{summary.under_maintenance}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{summary.inactive_rooms}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by room number or type..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
            <option value="Family Room">Family Room</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Room {room.room_number}</h3>
                  <p className="text-gray-600">{room.custom_room_type || room.room_type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(room.status)}`}>
                  {room.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bed:</span>
                  <span className="font-medium">{room.bed_configuration}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Floor:</span>
                  <span className="font-medium">{room.floor_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Occupancy:</span>
                  <span className="font-medium">{room.max_occupancy} guests</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium text-indigo-600">{formatCurrency(room.base_price)}/night</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Amenities:</p>
                <div className="flex flex-wrap gap-1">
                  {room.has_wifi && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">WiFi</span>}
                  {room.has_tv && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">TV</span>}
                  {room.has_ac && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">A/C</span>}
                  {room.has_refrigerator && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Fridge</span>}
                  {room.has_mini_bar && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Mini Bar</span>}
                  {room.has_safe && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Safe</span>}
                  {room.has_balcony && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Balcony</span>}
                  {room.has_bathtub && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Bathtub</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <Link
                  href={`/rooms/${room.id}`}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-center text-sm font-medium transition-colors"
                >
                  View Details
                </Link>
                <Link
                  href={`/rooms/${room.id}/edit`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRooms.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-5a2 2 0 012-2h2a2 2 0 012 2v5" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No rooms found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {rooms.length === 0 ? 'Get started by creating your first room.' : 'Try adjusting your search or filters.'}
          </p>
          <div className="mt-6">
            <Link
              href="/rooms/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Room
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}