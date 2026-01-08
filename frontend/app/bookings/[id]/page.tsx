'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface BookingService {
  id: number
  service_name: string
  quantity: number
  unit_price: number
  total_price: number
  service_date: string
  notes: string | null
}

interface Booking {
  id: number
  guest_name: string
  guest_phone: string
  guest_email: string | null
  guest_id_type: string
  guest_id_number: string
  guest_address: string | null
  room_id: number
  room?: {
    id: number
    room_number: string
    room_type: string
    floor_number: number
  }
  check_in_date: string
  check_out_date: string
  actual_check_in: string | null
  actual_check_out: string | null
  adults: number
  children: number
  total_nights: number
  room_rate_per_night: number
  room_charges: number
  additional_charges: number
  total_amount: number
  advance_payment: number
  balance_due: number
  payment_status: string
  status: string
  booking_source: string
  special_requests: string | null
  created_at: string
  updated_at: string
  services?: BookingService[]
}

// Common extra items with default prices
const COMMON_ITEMS = [
  { name: 'Water Bottle', price: 20 },
  { name: 'Extra Towel', price: 50 },
  { name: 'Extra Pillow', price: 30 },
  { name: 'Extra Blanket', price: 50 },
  { name: 'Room Service (Food)', price: 0 },
  { name: 'Laundry', price: 0 },
  { name: 'Taxi/Cab', price: 0 },
  { name: 'Airport Pickup', price: 500 },
  { name: 'Airport Drop', price: 500 },
  { name: 'Late Checkout', price: 0 },
  { name: 'Early Check-in', price: 0 },
  { name: 'Mini Bar', price: 0 },
  { name: 'Snacks', price: 0 },
  { name: 'Soft Drinks', price: 30 },
  { name: 'Other', price: 0 },
]

export default function BookingDetailPage() {
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [refundAdvance, setRefundAdvance] = useState(false)
  const [services, setServices] = useState<BookingService[]>([])
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: 0, notes: '' })

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
      fetchServices()
    }
  }, [bookingId])

  // Handle hash navigation to auto-open Add Item modal
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#add-item' && booking && ['Confirmed', 'Checked In'].includes(booking.status)) {
      setShowAddItemModal(true)
      // Clear the hash after opening modal
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [booking])

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (err) {
      console.error('Failed to fetch services:', err)
    }
  }

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Booking not found')
      }

      const data = await response.json()
      setBooking(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!confirm('Are you sure you want to check in this guest?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}/check-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to check in')
      }

      await fetchBooking()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to check out this guest?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}/check-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to check out')
      }

      await fetchBooking()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setActionLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel?refund_advance=${refundAdvance}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to cancel booking')
      }

      setShowCancelModal(false)
      await fetchBooking()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return

    try {
      setActionLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete booking')
      }

      router.push('/bookings')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCollectPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}/collect-payment?amount=${amount}&payment_mode=${paymentMode}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to collect payment')
      }

      setShowPaymentModal(false)
      setPaymentAmount('')
      await fetchBooking()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      alert('Please enter an item name')
      return
    }
    if (newItem.price < 0) {
      alert('Price cannot be negative')
      return
    }

    try {
      setActionLoading(true)
      const params = new URLSearchParams({
        service_name: newItem.name.trim(),
        quantity: newItem.quantity.toString(),
        unit_price: newItem.price.toString(),
      })
      if (newItem.notes.trim()) {
        params.append('notes', newItem.notes.trim())
      }

      const response = await fetch(`${API_URL}/bookings/${bookingId}/services?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to add item')
      }

      setShowAddItemModal(false)
      setNewItem({ name: '', quantity: 1, price: 0, notes: '' })
      await fetchBooking()
      await fetchServices()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteItem = async (serviceId: number) => {
    if (!confirm('Are you sure you want to remove this item?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`${API_URL}/bookings/${bookingId}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to remove item')
      }

      await fetchBooking()
      await fetchServices()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const selectCommonItem = (item: { name: string; price: number }) => {
    setNewItem(prev => ({
      ...prev,
      name: item.name,
      price: item.price,
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-100 text-blue-800'
      case 'Checked In': return 'bg-green-100 text-green-800'
      case 'Checked Out': return 'bg-gray-100 text-gray-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800'
      case 'Partially Paid': return 'bg-yellow-100 text-yellow-800'
      case 'Unpaid': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/bookings"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/bookings"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking #{booking.id}</h1>
            <p className="text-gray-600 mt-1">
              Room {booking.room?.room_number || 'N/A'} - {booking.guest_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
            {booking.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
            {booking.payment_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <p className="font-medium text-gray-900">{booking.guest_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p className="font-medium text-gray-900">{booking.guest_phone}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium text-gray-900">{booking.guest_email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ID ({booking.guest_id_type})</label>
                <p className="font-medium text-gray-900">{booking.guest_id_number}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">Address</label>
                <p className="font-medium text-gray-900">{booking.guest_address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stay Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Room</label>
                <p className="font-medium text-gray-900">
                  Room {booking.room?.room_number || 'N/A'} - {booking.room?.room_type || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Floor</label>
                <p className="font-medium text-gray-900">{booking.room?.floor_number || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Check-in Date</label>
                <p className="font-medium text-gray-900">{formatDate(booking.check_in_date)}</p>
                {booking.actual_check_in && (
                  <p className="text-sm text-green-600">Checked in: {formatDate(booking.actual_check_in)}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Check-out Date</label>
                <p className="font-medium text-gray-900">{formatDate(booking.check_out_date)}</p>
                {booking.actual_check_out && (
                  <p className="text-sm text-gray-600">Checked out: {formatDate(booking.actual_check_out)}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Total Nights</label>
                <p className="font-medium text-gray-900">{booking.total_nights}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Guests</label>
                <p className="font-medium text-gray-900">{booking.adults} Adults, {booking.children} Children</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Booking Source</label>
                <p className="font-medium text-gray-900">{booking.booking_source}</p>
              </div>
              {booking.special_requests && (
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-500">Special Requests</label>
                  <p className="font-medium text-gray-900">{booking.special_requests}</p>
                </div>
              )}
            </div>
          </div>

          {/* Extra Items / Services Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Extra Items / Services</h2>
              {['Confirmed', 'Checked In'].includes(booking.status) && (
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              )}
            </div>

            {services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm">No extra items added</p>
                {['Confirmed', 'Checked In'].includes(booking.status) && (
                  <p className="text-xs mt-1">Add items like water bottles, room service, taxi, etc.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{service.service_name}</p>
                      <p className="text-sm text-gray-500">
                        {service.quantity} x {formatCurrency(service.unit_price)}
                        {service.notes && <span className="ml-2">• {service.notes}</span>}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">{formatCurrency(service.total_price)}</span>
                      {['Confirmed', 'Checked In'].includes(booking.status) && (
                        <button
                          onClick={() => handleDeleteItem(service.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t border-gray-200 font-semibold">
                  <span>Total Extra Charges</span>
                  <span className="text-indigo-600">{formatCurrency(services.reduce((sum, s) => sum + s.total_price, 0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Room Rate (per night)</span>
                <span className="font-medium">{formatCurrency(booking.room_rate_per_night)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room Charges ({booking.total_nights} nights)</span>
                <span className="font-medium">{formatCurrency(booking.room_charges)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Additional Charges</span>
                <span className="font-medium">{formatCurrency(booking.additional_charges)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="font-bold text-lg text-indigo-600">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Advance Payment</span>
                <span className="font-medium">-{formatCurrency(booking.advance_payment)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Balance Due</span>
                <span className={`font-bold text-lg ${booking.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(booking.balance_due)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {booking.status === 'Confirmed' && (
                <>
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    {actionLoading ? 'Processing...' : 'Check In Guest'}
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              {booking.status === 'Checked In' && (
                <>
                  {booking.balance_due > 0 && (
                    <button
                      onClick={() => {
                        setPaymentAmount(booking.balance_due.toString())
                        setShowPaymentModal(true)
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      Collect Payment ({formatCurrency(booking.balance_due)})
                    </button>
                  )}
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    {actionLoading ? 'Processing...' : 'Check Out Guest'}
                  </button>
                </>
              )}
              {!['Cancelled', 'Checked Out'].includes(booking.status) && (
                <Link
                  href={`/bookings/${booking.id}/edit`}
                  className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                >
                  Edit Booking
                </Link>
              )}
              <button
                onClick={() => window.print()}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg font-medium transition-colors"
              >
                Print Invoice
              </button>
              {['Cancelled', 'Checked Out'].includes(booking.status) && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="w-full border border-red-300 hover:bg-red-50 text-red-600 py-2 rounded-lg font-medium transition-colors"
                >
                  {actionLoading ? 'Deleting...' : 'Delete Booking'}
                </button>
              )}
            </div>
          </div>

          {/* Booking Info */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-700">{formatDate(booking.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated</span>
              <span className="text-gray-700">{formatDate(booking.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Collection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Collect Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter amount"
                  max={booking.balance_due}
                />
                <p className="text-sm text-gray-500 mt-1">Balance due: {formatCurrency(booking.balance_due)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCollectPayment}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                >
                  {actionLoading ? 'Processing...' : 'Collect Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Booking</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to cancel this booking?</p>
            {booking.advance_payment > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-3">
                  This booking has an advance payment of {formatCurrency(booking.advance_payment)}.
                </p>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={refundAdvance}
                    onChange={(e) => setRefundAdvance(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Refund advance payment (mark as not received)</span>
                </label>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setRefundAdvance(false)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Extra Item / Service</h3>

            {/* Quick Select Common Items */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ITEMS.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => selectCommonItem(item)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      newItem.name === item.name
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                    {item.price > 0 && <span className="ml-1 text-xs text-gray-500">₹{item.price}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Water Bottle, Taxi, Room Service"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newItem.price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {newItem.quantity > 0 && newItem.price > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">Total: <span className="font-semibold text-indigo-600">{formatCurrency(newItem.quantity * newItem.price)}</span></p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newItem.notes}
                  onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddItemModal(false)
                    setNewItem({ name: '', quantity: 1, price: 0, notes: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={actionLoading || !newItem.name.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {actionLoading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
