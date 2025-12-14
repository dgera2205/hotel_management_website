'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

interface DashboardStats {
  total_rooms: number
  active_rooms: number
  occupied_rooms: number
  today_checkins: number
  today_checkouts: number
  pending_payments: number
  monthly_revenue: number
  monthly_expenses: number
  outstanding_debt: number
  occupancy_rate: number
}

interface TodayCheckin {
  booking_id: number
  guest_name: string
  guest_phone: string
  room_number: string
  adults: number
  children: number
  check_in_date: string
  advance_payment: number
  total_amount: number
}

interface TodayCheckout {
  booking_id: number
  guest_name: string
  guest_phone: string
  room_number: string
  balance_due: number
  check_out_date: string
}

interface QuickAction {
  title: string
  icon: React.ReactNode
  href: string
  color: string
}

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayCheckins, setTodayCheckins] = useState<TodayCheckin[]>([])
  const [todayCheckouts, setTodayCheckouts] = useState<TodayCheckout[]>([])
  const [loading, setLoading] = useState(true)
  const [checkInLoading, setCheckInLoading] = useState<number | null>(null)
  const [checkOutLoading, setCheckOutLoading] = useState<number | null>(null)
  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedCheckout, setSelectedCheckout] = useState<TodayCheckout | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  // Cancel booking modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedCheckin, setSelectedCheckin] = useState<TodayCheckin | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  // Update advance modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')
  // Add items modal state
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
  const [selectedBookingForItems, setSelectedBookingForItems] = useState<TodayCheckout | null>(null)
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: 0, notes: '' })
  const [addItemLoading, setAddItemLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardStats()
    }
  }, [isAuthenticated])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      // Get today's date in local timezone as YYYY-MM-DD
      const todayLocal = new Date().toISOString().split('T')[0]

      // Get room summary
      const roomSummary = await api.get('/rooms/summary')
      // Get today's checkins/checkouts - pass today's date to ensure timezone consistency
      const checkins = await api.get(`/bookings/today/checkins?target_date=${todayLocal}`)
      const checkouts = await api.get(`/bookings/today/checkouts?target_date=${todayLocal}`)
      // Get expense summary for outstanding debt
      const expenseSummary = await api.get('/expenses/summary')
      // Get revenue summary for this month
      const today = new Date()
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]
      const revenueSummary = await api.get(`/bookings/revenue/summary?date_from=${firstOfMonth}&date_to=${todayStr}`)
      // Get bookings to count occupied rooms
      const allBookings = await api.get('/bookings/')
      const occupiedRooms = allBookings.filter((b: { status: string }) => b.status === 'Checked In').length

      setTodayCheckins(checkins || [])
      setTodayCheckouts(checkouts || [])

      setStats({
        total_rooms: roomSummary.total_rooms || 0,
        active_rooms: roomSummary.active_rooms || 0,
        occupied_rooms: occupiedRooms,
        today_checkins: checkins.length || 0,
        today_checkouts: checkouts.length || 0,
        pending_payments: checkouts.reduce((sum: number, c: TodayCheckout) => sum + (c.balance_due || 0), 0),
        monthly_revenue: revenueSummary?.total_revenue || 0,
        monthly_expenses: expenseSummary?.total_amount || 0,
        outstanding_debt: expenseSummary?.total_due || 0,
        occupancy_rate: roomSummary.active_rooms ? (occupiedRooms / roomSummary.active_rooms) * 100 : 0
      })
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
      setStats({
        total_rooms: 0,
        active_rooms: 0,
        occupied_rooms: 0,
        today_checkins: 0,
        today_checkouts: 0,
        pending_payments: 0,
        monthly_revenue: 0,
        monthly_expenses: 0,
        outstanding_debt: 0,
        occupancy_rate: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (bookingId: number) => {
    try {
      setCheckInLoading(bookingId)
      await api.post(`/bookings/${bookingId}/check-in`)
      // Refresh data
      await loadDashboardStats()
    } catch (error) {
      console.error('Failed to check in:', error)
      alert('Failed to check in guest')
    } finally {
      setCheckInLoading(null)
    }
  }

  const openCheckoutModal = (checkout: TodayCheckout) => {
    setSelectedCheckout(checkout)
    setPaymentAmount(checkout.balance_due > 0 ? checkout.balance_due.toString() : '')
    setShowCheckoutModal(true)
  }

  const handleCollectAndCheckout = async () => {
    if (!selectedCheckout) return

    try {
      setCheckOutLoading(selectedCheckout.booking_id)

      // If there's a balance and user entered a payment amount, collect it first
      const amount = parseFloat(paymentAmount)
      if (selectedCheckout.balance_due > 0 && amount > 0) {
        await api.post(`/bookings/${selectedCheckout.booking_id}/collect-payment?amount=${amount}&payment_mode=${paymentMode}`)
      }

      // Then check out
      await api.post(`/bookings/${selectedCheckout.booking_id}/check-out`)

      setShowCheckoutModal(false)
      setSelectedCheckout(null)
      setPaymentAmount('')
      // Refresh data
      await loadDashboardStats()
    } catch (error) {
      console.error('Failed to check out:', error)
      alert('Failed to check out guest')
    } finally {
      setCheckOutLoading(null)
    }
  }

  const handleCancelBooking = async () => {
    if (!selectedCheckin) return

    try {
      setCancelLoading(true)
      await api.post(`/bookings/${selectedCheckin.booking_id}/cancel?refund_advance=true`)
      setShowCancelModal(false)
      setSelectedCheckin(null)
      await loadDashboardStats()
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert('Failed to cancel booking')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleUpdateAdvance = async () => {
    if (!selectedCheckin) return

    const amount = parseFloat(advanceAmount)
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setCancelLoading(true)
      // Use the booking update endpoint to update advance payment
      await api.put(`/bookings/${selectedCheckin.booking_id}`, {
        advance_payment: amount
      })
      setShowAdvanceModal(false)
      setSelectedCheckin(null)
      setAdvanceAmount('')
      await loadDashboardStats()
    } catch (error) {
      console.error('Failed to update advance:', error)
      alert('Failed to update advance payment')
    } finally {
      setCancelLoading(false)
    }
  }

  // Common extra items with default prices
  const COMMON_ITEMS = [
    { name: 'Water Bottle', price: 20 },
    { name: 'Extra Towel', price: 50 },
    { name: 'Room Service (Food)', price: 0 },
    { name: 'Laundry', price: 0 },
    { name: 'Taxi/Cab', price: 0 },
    { name: 'Mini Bar', price: 0 },
    { name: 'Snacks', price: 0 },
    { name: 'Soft Drinks', price: 30 },
    { name: 'Other', price: 0 },
  ]

  const handleAddItem = async () => {
    if (!selectedBookingForItems) return
    if (!newItem.name.trim()) {
      alert('Please enter an item name')
      return
    }
    if (newItem.price < 0) {
      alert('Price cannot be negative')
      return
    }

    try {
      setAddItemLoading(true)
      const params = new URLSearchParams({
        service_name: newItem.name.trim(),
        quantity: newItem.quantity.toString(),
        unit_price: newItem.price.toString(),
      })
      if (newItem.notes.trim()) {
        params.append('notes', newItem.notes.trim())
      }

      await api.post(`/bookings/${selectedBookingForItems.booking_id}/services?${params}`)

      setShowAddItemsModal(false)
      setSelectedBookingForItems(null)
      setNewItem({ name: '', quantity: 1, price: 0, notes: '' })
      await loadDashboardStats()
    } catch (error) {
      console.error('Failed to add item:', error)
      alert('Failed to add item')
    } finally {
      setAddItemLoading(false)
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

  if (isLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const quickActions: QuickAction[] = [
    {
      title: 'Add New Room',
      href: '/rooms/new',
      color: 'bg-blue-500 hover:bg-blue-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m0-9V9a2 2 0 00-2-2H9a2 2 0 00-2 2v2.22" />
        </svg>
      )
    },
    {
      title: 'New Booking',
      href: '/bookings/new',
      color: 'bg-green-500 hover:bg-green-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'Add Expense',
      href: '/expenses?action=add',
      color: 'bg-orange-500 hover:bg-orange-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: 'Guest Check-In',
      href: '/bookings?action=checkin',
      color: 'bg-purple-500 hover:bg-purple-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hotel Management Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, <span className="font-semibold text-indigo-600">{user?.username}</span>
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-right">
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m0-9V9a2 2 0 00-2-2H9a2 2 0 00-2 2v2.22" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_rooms || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.occupancy_rate.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.today_checkins || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Checked-in Guests</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.today_checkouts || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => router.push(action.href)}
              className={`${action.color} text-white p-4 rounded-lg flex flex-col items-center justify-center space-y-2 transition-all transform hover:scale-105`}
            >
              {action.icon}
              <span className="text-sm font-medium text-center">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Check-ins Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            Pending Check-ins
            <span className="ml-2 text-sm font-normal text-gray-500">({todayCheckins.length} guests)</span>
          </h3>
        </div>

        {todayCheckins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todayCheckins.map((checkin) => (
                  <tr key={checkin.booking_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{checkin.guest_name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-lg">
                        Room {checkin.room_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(checkin.check_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {checkin.adults} Adult{checkin.adults !== 1 ? 's' : ''}
                      {checkin.children > 0 && `, ${checkin.children} Child${checkin.children !== 1 ? 'ren' : ''}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedCheckin(checkin)
                          setAdvanceAmount((checkin.advance_payment || 0).toString())
                          setShowAdvanceModal(true)
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {formatCurrency(checkin.advance_payment || 0)}
                        <svg className="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCheckin(checkin)
                            setShowCancelModal(true)
                          }}
                          className="px-2 py-1 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCheckIn(checkin.booking_id)}
                          disabled={checkInLoading === checkin.booking_id}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                        >
                          {checkInLoading === checkin.booking_id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Check In
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2">No check-ins scheduled for today</p>
          </div>
        )}
      </div>

      {/* Checked-in Guests Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            Checked-in Guests
            <span className="ml-2 text-sm font-normal text-gray-500">({todayCheckouts.length} guests)</span>
          </h3>
          {stats?.pending_payments && stats.pending_payments > 0 && (
            <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
              Total Balance Due: {formatCurrency(stats.pending_payments)}
            </span>
          )}
        </div>

        {todayCheckouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checkout Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Due</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todayCheckouts.map((checkout) => (
                  <tr key={checkout.booking_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{checkout.guest_name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-lg">
                        Room {checkout.room_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(checkout.check_out_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {checkout.guest_phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {checkout.balance_due > 0 ? (
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(checkout.balance_due)}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-green-600">Paid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBookingForItems(checkout)
                            setShowAddItemsModal(true)
                          }}
                          className="px-2 py-1 text-xs font-medium text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
                          title="Add extra items"
                        >
                          + Items
                        </button>
                        <button
                          onClick={() => openCheckoutModal(checkout)}
                          disabled={checkOutLoading === checkout.booking_id}
                          className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                        >
                          {checkOutLoading === checkout.booking_id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                              </svg>
                              Check Out
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2">No guests currently checked in</p>
          </div>
        )}
      </div>

      {/* Financial Overview & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-800">Revenue (This Month)</span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(stats?.monthly_revenue || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-red-800">Expenses (This Month)</span>
              <span className="text-sm font-bold text-red-600">{formatCurrency(stats?.monthly_expenses || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-800">Outstanding Debt</span>
              <span className="text-sm font-bold text-orange-600">{formatCurrency(stats?.outstanding_debt || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border-t-2 border-indigo-300">
              <span className="text-sm font-medium text-indigo-800">Net Profit</span>
              <span className={`text-sm font-bold ${(stats?.monthly_revenue || 0) - (stats?.monthly_expenses || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency((stats?.monthly_revenue || 0) - (stats?.monthly_expenses || 0))}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/reports')}
            className="mt-4 w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            View Detailed Reports →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/rooms')}
              className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">Rooms</p>
              <p className="text-sm text-gray-500">Manage room inventory</p>
            </button>
            <button
              onClick={() => router.push('/bookings')}
              className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">Bookings</p>
              <p className="text-sm text-gray-500">View reservations</p>
            </button>
            <button
              onClick={() => router.push('/expenses')}
              className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">Expenses</p>
              <p className="text-sm text-gray-500">Financial tracking</p>
            </button>
            <button
              onClick={() => router.push('/reports')}
              className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">Reports</p>
              <p className="text-sm text-gray-500">Financial analysis</p>
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal with Balance Collection */}
      {showCheckoutModal && selectedCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check Out Guest</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedCheckout.guest_name}</p>
                <p className="text-sm text-gray-600">Room {selectedCheckout.room_number}</p>
              </div>

              {selectedCheckout.balance_due > 0 ? (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-orange-800 mb-2">
                      Outstanding Balance: {formatCurrency(selectedCheckout.balance_due)}
                    </p>
                    <p className="text-xs text-orange-600">
                      Please collect the remaining balance before checkout
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount to Collect (₹)
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter amount"
                      max={selectedCheckout.balance_due}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Mode
                    </label>
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
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800">
                    ✓ All payments collected. Ready for checkout.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCheckoutModal(false)
                    setSelectedCheckout(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCollectAndCheckout}
                  disabled={checkOutLoading === selectedCheckout.booking_id}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 transition-colors"
                >
                  {checkOutLoading === selectedCheckout.booking_id ? 'Processing...' : 'Confirm Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedCheckin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Booking</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedCheckin.guest_name}</p>
                <p className="text-sm text-gray-600">Room {selectedCheckin.room_number}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Are you sure you want to cancel this booking?
                </p>
                {(selectedCheckin.advance_payment || 0) > 0 && (
                  <p className="text-sm text-yellow-800 mt-2">
                    Advance payment of {formatCurrency(selectedCheckin.advance_payment || 0)} will be marked as refunded.
                  </p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCancelModal(false)
                    setSelectedCheckin(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Advance Payment Modal */}
      {showAdvanceModal && selectedCheckin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Advance Payment</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedCheckin.guest_name}</p>
                <p className="text-sm text-gray-600">Room {selectedCheckin.room_number}</p>
                <p className="text-sm text-gray-600">Total Amount: {formatCurrency(selectedCheckin.total_amount || 0)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter advance amount"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current advance: {formatCurrency(selectedCheckin.advance_payment || 0)}
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAdvanceModal(false)
                    setSelectedCheckin(null)
                    setAdvanceAmount('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAdvance}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {cancelLoading ? 'Updating...' : 'Update Advance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && selectedBookingForItems && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Extra Item / Service</h3>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900">{selectedBookingForItems.guest_name}</p>
              <p className="text-sm text-gray-600">Room {selectedBookingForItems.room_number}</p>
            </div>

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
                    setShowAddItemsModal(false)
                    setSelectedBookingForItems(null)
                    setNewItem({ name: '', quantity: 1, price: 0, notes: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={addItemLoading || !newItem.name.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {addItemLoading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}