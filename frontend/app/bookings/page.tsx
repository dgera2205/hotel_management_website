'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface Room {
  id: number
  room_number: string
  room_type: string
  base_price: number
  status: string
}

interface Booking {
  id: number
  guest_name: string
  guest_phone: string
  room_number: string
  room_id: number
  check_in_date: string
  check_out_date: string
  total_amount: number
  payment_status: string
  status: string
  created_at: string
}

interface CalendarDay {
  date: Date
  dateString: string
  isCurrentMonth: boolean
  isToday: boolean
}

type SortField = 'check_in_date' | 'check_out_date' | 'guest_name' | 'room_number' | 'total_amount' | 'created_at'
type SortDirection = 'asc' | 'desc'

// Helper function to format date as YYYY-MM-DD in local timezone
// This avoids timezone issues when using toISOString() which converts to UTC
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function BookingsPage() {
  const { token } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [sortField, setSortField] = useState<SortField>('check_in_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchRooms()
    fetchBookings()
  }, [currentDate])

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
        // Sort rooms by room number and include all statuses for calendar display
        setRooms(data.sort((a: Room, b: Room) => a.room_number.localeCompare(b.room_number, undefined, {numeric: true})))
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
    }
  }

  // Get room status color for room row background
  const getRoomStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    if (normalizedStatus === 'under maintenance' || normalizedStatus === 'maintenance') {
      return 'bg-orange-50'
    }
    if (normalizedStatus === 'inactive') {
      return 'bg-red-50'
    }
    return 'bg-white'
  }

  // Get room status badge color
  const getRoomStatusBadge = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    if (normalizedStatus === 'under maintenance' || normalizedStatus === 'maintenance') {
      return 'bg-orange-100 text-orange-800'
    }
    if (normalizedStatus === 'inactive') {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bookings/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (bookingId: number) => {
    if (!confirm('Are you sure you want to check in this guest?')) return

    try {
      setActionLoading(bookingId)
      const response = await fetch(`/api/bookings/${bookingId}/check-in`, {
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

      await fetchBookings()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckOut = async (bookingId: number) => {
    if (!confirm('Are you sure you want to check out this guest?')) return

    try {
      setActionLoading(bookingId)
      const response = await fetch(`/api/bookings/${bookingId}/check-out`, {
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

      await fetchBookings()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  // Number of days to display in the calendar view
  const DAYS_TO_DISPLAY = 14

  // Generate calendar days starting from currentDate
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Start from currentDate and generate DAYS_TO_DISPLAY days
    const startDate = new Date(currentDate)
    startDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < DAYS_TO_DISPLAY; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      days.push({
        date,
        dateString: formatDateLocal(date),  // Use local timezone formatting to avoid UTC shift
        isCurrentMonth: date.getMonth() === startDate.getMonth(),
        isToday: date.getTime() === today.getTime()
      })
    }

    return days
  }, [currentDate])

  // Get bookings for a specific room and date
  const getBookingForRoomAndDate = (roomId: number, dateString: string) => {
    return bookings.find(booking => {
      // Normalize date strings - extract YYYY-MM-DD portion
      const checkIn = booking.check_in_date.split('T')[0]
      const checkOut = booking.check_out_date.split('T')[0]

      // Booking should appear on:
      // - Check-in date and all subsequent dates
      // - Up to (but NOT including) the checkout date
      // Example: Check-in Dec 12, Checkout Dec 14 -> Guest appears on Dec 12, Dec 13 only (NOT Dec 14)
      return booking.room_id === roomId &&
             dateString >= checkIn &&
             dateString < checkOut  // Strictly less than checkout date
    })
  }

  // Navigate by the number of days displayed (continuous scrolling without gaps)
  const navigateDays = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      // Move forward or backward by the number of days displayed
      newDate.setDate(newDate.getDate() + (direction === 'next' ? DAYS_TO_DISPLAY : -DAYS_TO_DISPLAY))
      return newDate
    })
  }

  // Jump to today
  const goToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setCurrentDate(today)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-500'
      case 'Checked In': return 'bg-green-500'
      case 'Checked Out': return 'bg-gray-400'
      case 'Cancelled': return 'bg-red-500'
      default: return 'bg-yellow-500'
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800'
      case 'Partially Paid': return 'bg-yellow-100 text-yellow-800'
      case 'Unpaid': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Sort bookings based on selected field and direction
  const sortedBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'check_in_date':
          aVal = a.check_in_date
          bVal = b.check_in_date
          break
        case 'check_out_date':
          aVal = a.check_out_date
          bVal = b.check_out_date
          break
        case 'guest_name':
          aVal = a.guest_name.toLowerCase()
          bVal = b.guest_name.toLowerCase()
          break
        case 'room_number':
          aVal = a.room_number
          bVal = b.room_number
          break
        case 'total_amount':
          aVal = a.total_amount
          bVal = b.total_amount
          break
        case 'created_at':
          aVal = a.created_at
          bVal = b.created_at
          break
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [bookings, sortField, sortDirection])

  // Toggle sort direction or set new field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-300 ml-1">↕</span>
    }
    return <span className="text-indigo-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-2">Manage room reservations and availability</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'
              }`}
            >
              List
            </button>
          </div>
          <Link
            href="/bookings/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Booking
          </Link>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Navigation */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDays('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="ml-1 text-sm text-gray-600">Prev {DAYS_TO_DISPLAY} days</span>
              </button>
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {calendarDays.length > 0 && (
                    <>
                      {calendarDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {calendarDays[calendarDays.length - 1].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </>
                  )}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Today
                </button>
              </div>
              <button
                onClick={() => navigateDays('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
              >
                <span className="mr-1 text-sm text-gray-600">Next {DAYS_TO_DISPLAY} days</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Room x Date Grid */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[120px]">
                      Room
                    </th>
                    {calendarDays.slice(0, 14).map((day) => (
                      <th
                        key={day.dateString}
                        className={`px-2 py-3 text-center text-xs font-medium min-w-[60px] ${
                          day.isToday ? 'bg-indigo-100' : day.isCurrentMonth ? '' : 'bg-gray-100'
                        }`}
                      >
                        <div className="text-gray-500">
                          {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-lg ${day.isToday ? 'text-indigo-600 font-bold' : 'text-gray-900'}`}>
                          {day.date.getDate()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => {
                    const isRoomAvailable = room.status?.toLowerCase() === 'active'
                    return (
                      <tr key={room.id} className={`border-t border-gray-200 ${getRoomStatusColor(room.status)}`}>
                        <td className={`sticky left-0 px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 ${getRoomStatusColor(room.status)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div>Room {room.room_number}</div>
                              <div className="text-xs text-gray-500">{room.room_type}</div>
                            </div>
                            {!isRoomAvailable && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getRoomStatusBadge(room.status)}`}>
                                {room.status}
                              </span>
                            )}
                          </div>
                        </td>
                        {calendarDays.slice(0, 14).map((day) => {
                          const booking = getBookingForRoomAndDate(room.id, day.dateString)
                          return (
                            <td
                              key={`${room.id}-${day.dateString}`}
                              className={`px-1 py-2 text-center border-l border-gray-100 ${
                                day.isToday ? 'bg-indigo-50' : day.isCurrentMonth ? '' : 'bg-gray-50'
                              }`}
                            >
                              {booking ? (
                                <Link
                                  href={`/bookings/${booking.id}`}
                                  className={`block px-1 py-1 rounded text-xs text-white ${getStatusColor(booking.status)}`}
                                  title={`${booking.guest_name} - ${booking.status}`}
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.2',
                                    maxHeight: '2.4em',
                                    minHeight: '1.2em'
                                  }}
                                >
                                  {booking.guest_name.split(' ')[0]}
                                </Link>
                              ) : isRoomAvailable ? (
                                <Link
                                  href={`/bookings/new?room=${room.id}&date=${day.dateString}`}
                                  className="block w-full h-6 hover:bg-green-100 rounded transition-colors"
                                />
                              ) : (
                                <div className="w-full h-6 bg-gray-100 rounded opacity-50" title={`Room ${room.status}`} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Booking Status</h3>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-blue-500 mr-2"></div>
                <span className="text-sm text-gray-600">Confirmed</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-600">Checked In</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-gray-400 mr-2"></div>
                <span className="text-sm text-gray-600">Checked Out</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-yellow-500 mr-2"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-red-500 mr-2"></div>
                <span className="text-sm text-gray-600">Cancelled</span>
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Room Status</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-white border border-gray-300 mr-2"></div>
                <span className="text-sm text-gray-600">Active</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300 mr-2"></div>
                <span className="text-sm text-gray-600">Under Maintenance</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-300 mr-2"></div>
                <span className="text-sm text-gray-600">Inactive</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('guest_name')}
                >
                  Guest <SortIndicator field="guest_name" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('room_number')}
                >
                  Room <SortIndicator field="room_number" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('check_in_date')}
                >
                  Check-in <SortIndicator field="check_in_date" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('check_out_date')}
                >
                  Check-out <SortIndicator field="check_out_date" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_amount')}
                >
                  Amount <SortIndicator field="total_amount" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  Created <SortIndicator field="created_at" />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.guest_name}</div>
                    <div className="text-sm text-gray-500">{booking.guest_phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Room {booking.room_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(booking.check_in_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(booking.check_out_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(booking.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusBadge(booking.payment_status)}`}>
                      {booking.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs text-white rounded ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                    {booking.status === 'Confirmed' && (
                      <button
                        onClick={() => handleCheckIn(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        {actionLoading === booking.id ? 'Processing...' : 'Check In'}
                      </button>
                    )}
                    {booking.status === 'Checked In' && (
                      <>
                        <Link
                          href={`/bookings/${booking.id}#add-item`}
                          className="text-purple-600 hover:text-purple-900"
                          title="Add extra items"
                        >
                          + Items
                        </Link>
                        <button
                          onClick={() => handleCheckOut(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                        >
                          {actionLoading === booking.id ? 'Processing...' : 'Check Out'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedBookings.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new booking.</p>
              <div className="mt-6">
                <Link
                  href="/bookings/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  New Booking
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}