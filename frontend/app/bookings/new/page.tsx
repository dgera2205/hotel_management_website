'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface Room {
  id: number
  room_number: string
  room_type: string
  base_price: number
  max_occupancy: number
  status: string
}

export default function NewBookingPage() {
  const { token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ID proof types for India
  const idProofTypes = [
    'Aadhar Card',
    'PAN Card',
    'Voter ID',
    'Passport',
    'Driver License',
    'Ration Card',
    'Other'
  ]

  // Booking sources matching backend enum
  const bookingSources = [
    { value: 'Walk-in', label: 'Walk-in' },
    { value: 'Phone', label: 'Phone' },
    { value: 'OTA-MakeMyTrip', label: 'MakeMyTrip' },
    { value: 'OTA-Booking.com', label: 'Booking.com' },
    { value: 'OTA-Goibibo', label: 'Goibibo' },
    { value: 'OTA-Agoda', label: 'Agoda' },
    { value: 'Corporate', label: 'Corporate' },
    { value: 'Repeat Customer', label: 'Repeat Customer' },
    { value: 'Agent', label: 'Agent' },
    { value: 'Other', label: 'Other' },
  ]

  const [selectedIdType, setSelectedIdType] = useState('Aadhar Card')
  const [idNumber, setIdNumber] = useState('')

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '+91 ',
    guest_email: '',
    guest_id_proof: '',
    room_id: searchParams.get('room') || '',
    check_in_date: searchParams.get('date') || '',
    check_out_date: '',
    adults: 1,
    children: 0,
    room_rate_per_night: 0,
    advance_payment: 0,
    special_requests: '',
    booking_source: 'Walk-in',
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    // Update room rate when room is selected
    if (formData.room_id) {
      const selectedRoom = rooms.find(r => r.id === parseInt(formData.room_id))
      if (selectedRoom) {
        setFormData(prev => ({ ...prev, room_rate_per_night: selectedRoom.base_price }))
      }
    }
  }, [formData.room_id, rooms])

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setRooms(data.filter((r: Room) => r.status === 'Active'))
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const calculateTotalNights = () => {
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date)
      const checkOut = new Date(formData.check_out_date)
      const diffTime = checkOut.getTime() - checkIn.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    }
    return 0
  }

  const calculateTotalAmount = () => {
    return calculateTotalNights() * formData.room_rate_per_night
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const submitData = {
        ...formData,
        room_id: parseInt(formData.room_id),
      }

      const response = await fetch('/api/bookings/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create booking')
      }

      router.push('/bookings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const selectedRoom = rooms.find(r => r.id === parseInt(formData.room_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Booking</h1>
          <p className="text-gray-600 mt-2">Create a new room reservation</p>
        </div>
        <Link
          href="/bookings"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Bookings
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guest Name *</label>
                <input
                  type="text"
                  name="guest_name"
                  required
                  value={formData.guest_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="guest_phone"
                  required
                  value={formData.guest_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="guest_email"
                  value={formData.guest_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="guest@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Type</label>
                <select
                  value={selectedIdType}
                  onChange={(e) => setSelectedIdType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {idProofTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => {
                    setIdNumber(e.target.value)
                    // Combine ID type and number for storage
                    setFormData(prev => ({
                      ...prev,
                      guest_id_proof: `${selectedIdType}: ${e.target.value}`
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={selectedIdType === 'Aadhar Card' ? 'XXXX XXXX XXXX' : 'Enter ID number'}
                />
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room *</label>
                <select
                  name="room_id"
                  required
                  value={formData.room_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a room</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number} - {room.room_type} ({formatCurrency(room.base_price)}/night)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Booking Source</label>
                <select
                  name="booking_source"
                  value={formData.booking_source}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {bookingSources.map(source => (
                    <option key={source.value} value={source.value}>{source.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date *</label>
                <input
                  type="date"
                  name="check_in_date"
                  required
                  value={formData.check_in_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Date *</label>
                <input
                  type="date"
                  name="check_out_date"
                  required
                  value={formData.check_out_date}
                  onChange={handleInputChange}
                  min={formData.check_in_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adults *</label>
                <input
                  type="number"
                  name="adults"
                  required
                  min="1"
                  max={selectedRoom?.max_occupancy || 10}
                  value={formData.adults}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                <input
                  type="number"
                  name="children"
                  min="0"
                  max="5"
                  value={formData.children}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
                <textarea
                  name="special_requests"
                  rows={3}
                  value={formData.special_requests}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Rate (per night)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    type="number"
                    name="room_rate_per_night"
                    min="0"
                    step="1"
                    value={formData.room_rate_per_night}
                    onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Advance Payment</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    type="number"
                    name="advance_payment"
                    min="0"
                    step="1"
                    value={formData.advance_payment}
                    onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h2>

            {selectedRoom && (
              <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                <h3 className="font-medium text-indigo-900">Room {selectedRoom.room_number}</h3>
                <p className="text-sm text-indigo-700">{selectedRoom.room_type}</p>
                <p className="text-sm text-indigo-700">Max occupancy: {selectedRoom.max_occupancy}</p>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rate per night:</span>
                <span className="font-medium">{formatCurrency(formData.room_rate_per_night)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Number of nights:</span>
                <span className="font-medium">{calculateTotalNights()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Guests:</span>
                <span className="font-medium">{formData.adults} adults, {formData.children} children</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">Total Amount:</span>
                  <span className="font-bold text-lg text-indigo-600">{formatCurrency(calculateTotalAmount())}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Advance Payment:</span>
                <span className="font-medium text-green-600">-{formatCurrency(formData.advance_payment)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-900">Balance Due:</span>
                <span className="text-orange-600">{formatCurrency(calculateTotalAmount() - formData.advance_payment)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Creating Booking...' : 'Create Booking'}
              </button>
              <Link
                href="/bookings"
                className="block w-full text-center py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}