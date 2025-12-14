'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

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

interface RoomFormData {
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
}

const ROOM_TYPES = [
  { value: 'Single', label: 'Single' },
  { value: 'Double', label: 'Double' },
  { value: 'Deluxe', label: 'Deluxe' },
  { value: 'Suite', label: 'Suite' },
  { value: 'Family Room', label: 'Family Room' },
  { value: 'Custom', label: 'Custom' },
]

const BED_CONFIGURATIONS = [
  { value: 'Single Bed', label: 'Single Bed' },
  { value: 'Double Bed', label: 'Double Bed' },
  { value: 'Twin Beds', label: 'Twin Beds' },
  { value: 'King Bed', label: 'King Bed' },
]

const ROOM_STATUSES = [
  { value: 'Active', label: 'Active' },
  { value: 'Under Maintenance', label: 'Under Maintenance' },
  { value: 'Inactive', label: 'Inactive' },
]

export default function EditRoomPage() {
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<RoomFormData>({
    room_number: '',
    room_type: 'Double',
    bed_configuration: 'Double Bed',
    max_occupancy: 2,
    base_price: 1000,
    status: 'Active',
    floor_number: 1,
    has_wifi: true,
    has_tv: true,
    has_ac: true,
    has_refrigerator: false,
    has_mini_bar: false,
    has_safe: false,
    has_balcony: false,
    has_bathtub: false,
    notes: '',
    custom_room_type: '',
  })

  useEffect(() => {
    if (roomId) {
      fetchRoom()
    }
  }, [roomId])

  const fetchRoom = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch room details')
      }

      const room: Room = await response.json()

      // Convert room data to form data
      setFormData({
        room_number: room.room_number,
        room_type: room.room_type,
        bed_configuration: room.bed_configuration,
        max_occupancy: room.max_occupancy,
        base_price: room.base_price,
        status: room.status,
        floor_number: room.floor_number,
        has_wifi: room.has_wifi,
        has_tv: room.has_tv,
        has_ac: room.has_ac,
        has_refrigerator: room.has_refrigerator,
        has_mini_bar: room.has_mini_bar,
        has_safe: room.has_safe,
        has_balcony: room.has_balcony,
        has_bathtub: room.has_bathtub,
        notes: room.notes || '',
        custom_room_type: room.custom_room_type || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Prepare data for submission - only include fields that have values
      const submitData: Record<string, unknown> = {
        room_type: formData.room_type,
        bed_configuration: formData.bed_configuration,
        floor_number: formData.floor_number,
        base_price: formData.base_price,
        max_occupancy: formData.max_occupancy,
        status: formData.status,
        has_ac: formData.has_ac,
        has_tv: formData.has_tv,
        has_wifi: formData.has_wifi,
        has_balcony: formData.has_balcony,
        has_refrigerator: formData.has_refrigerator,
        has_mini_bar: formData.has_mini_bar,
        has_safe: formData.has_safe,
        has_bathtub: formData.has_bathtub,
      }

      // Only include optional fields if they have values
      if (formData.notes) submitData.notes = formData.notes
      if (formData.custom_room_type) submitData.custom_room_type = formData.custom_room_type

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Handle error detail properly - could be string or object
        let errorMessage = 'Failed to update room'
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: { msg: string }) => e.msg).join(', ')
        } else if (errorData.detail?.msg) {
          errorMessage = errorData.detail.msg
        }
        throw new Error(errorMessage)
      }

      router.push(`/rooms/${roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
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

  if (error && !formData.room_number) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href={`/rooms/${roomId}`}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Room {formData.room_number}</h1>
              <p className="text-gray-600 mt-2">Update room information and settings</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm">
          <div className="p-6 space-y-6">

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="room_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    id="room_number"
                    name="room_number"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.room_number || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., 101, A-201"
                  />
                </div>

                <div>
                  <label htmlFor="room_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type *
                  </label>
                  <select
                    id="room_type"
                    name="room_type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.room_type}
                    onChange={handleInputChange}
                  >
                    {ROOM_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="bed_configuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Bed Configuration *
                  </label>
                  <select
                    id="bed_configuration"
                    name="bed_configuration"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.bed_configuration}
                    onChange={handleInputChange}
                  >
                    {BED_CONFIGURATIONS.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="max_occupancy" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Occupancy *
                  </label>
                  <input
                    type="number"
                    id="max_occupancy"
                    name="max_occupancy"
                    min="1"
                    max="10"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.max_occupancy || 2}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {ROOM_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Location & Pricing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="floor_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    id="floor_number"
                    name="floor_number"
                    min="0"
                    max="50"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.floor_number || 0}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (per night) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      id="base_price"
                      name="base_price"
                      min="0"
                      step="1"
                      required
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={formData.base_price || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Preview: {formatCurrency(formData.base_price)}/night
                  </p>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_wifi"
                    checked={formData.has_wifi}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">WiFi</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_tv"
                    checked={formData.has_tv}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">TV</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_ac"
                    checked={formData.has_ac}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Air Conditioning</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_refrigerator"
                    checked={formData.has_refrigerator}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Refrigerator</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_mini_bar"
                    checked={formData.has_mini_bar}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Mini Bar</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_safe"
                    checked={formData.has_safe}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Safe</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_balcony"
                    checked={formData.has_balcony}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Balcony</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="has_bathtub"
                    checked={formData.has_bathtub}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Bathtub</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Optional notes about the room..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <Link
                href={`/rooms/${roomId}`}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
              >
                {submitting ? 'Updating...' : 'Update Room'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}