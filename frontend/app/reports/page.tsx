'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface ReportData {
  revenue: {
    total: number
    this_period: number
    paid: number
    pending: number
    by_room_type: Record<string, number>
  }
  occupancy: {
    rate: number
    total_rooms: number
    occupied_rooms: number
    available_rooms: number
  }
  bookings: {
    total: number
    confirmed: number
    checked_in: number
    checked_out: number
    cancelled: number
  }
  expenses: {
    total: number
    paid: number
    pending: number
    total_due: number
    by_category: Record<string, number>
  }
  events: {
    total: number
    revenue: number
    collected: number
    pending: number
    vendor_cost: number
    vendor_paid: number
    vendor_pending: number
    profit_margin: number
  }
  profit: number
}

type BookingTypeFilter = 'both' | 'hotel' | 'events'

// Helper to format date as YYYY-MM-DD
const formatDateForApi = (date: Date) => {
  return date.toISOString().split('T')[0]
}

// Get date range based on preset
const getDateRange = (preset: string): { from: Date, to: Date } => {
  const today = new Date()
  const to = new Date(today)
  let from = new Date(today)

  switch (preset) {
    case 'today':
      break
    case 'week':
      from.setDate(today.getDate() - 7)
      break
    case 'month':
      from.setMonth(today.getMonth() - 1)
      break
    case 'quarter':
      from.setMonth(today.getMonth() - 3)
      break
    case 'year':
      from.setFullYear(today.getFullYear() - 1)
      break
    case 'custom':
      // Keep the current dates
      break
    default:
      from.setMonth(today.getMonth() - 1)
  }

  return { from, to }
}

export default function ReportsPage() {
  const { token } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month')
  const [bookingType, setBookingType] = useState<BookingTypeFilter>('both')

  // Date range state
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return formatDateForApi(d)
  })
  const [dateTo, setDateTo] = useState<string>(() => formatDateForApi(new Date()))

  // Handle date preset change
  const handlePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const { from, to } = getDateRange(preset)
      setDateFrom(formatDateForApi(from))
      setDateTo(formatDateForApi(to))
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateFrom, dateTo, bookingType])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      // Fetch data from multiple endpoints with date filters
      const dateParams = `?date_from=${dateFrom}&date_to=${dateTo}`

      const [roomsRes, bookingsRes, expensesRes, revenueRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/rooms/summary`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URL}/bookings/${dateParams}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URL}/expenses/summary${dateParams}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URL}/bookings/revenue/summary${dateParams}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URL}/event-bookings/summary${dateParams}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      ])

      const roomsSummary = roomsRes.ok ? await roomsRes.json() : null
      const bookings = bookingsRes.ok ? await bookingsRes.json() : []
      const expensesSummary = expensesRes.ok ? await expensesRes.json() : null
      const revenueSummary = revenueRes.ok ? await revenueRes.json() : null
      const eventsSummary = eventsRes.ok ? await eventsRes.json() : null

      // Filter bookings by date range for stats
      const filteredBookings = bookings.filter((b: { check_in_date: string, created_at: string }) => {
        const bookingDate = b.check_in_date.split('T')[0]
        return bookingDate >= dateFrom && bookingDate <= dateTo
      })

      // Hotel revenue from existing bookings
      const hotelRevenue = revenueSummary?.total_revenue || 0
      const hotelPaid = revenueSummary?.revenue_collected || 0
      const hotelPending = revenueSummary?.revenue_pending || 0

      // Event revenue data (matching backend EventBookingSummary field names)
      const eventRevenue = eventsSummary?.total_revenue || 0
      const eventCollected = eventsSummary?.total_collected || 0
      const eventPending = eventsSummary?.revenue_pending || 0
      const eventVendorCost = eventsSummary?.total_expenses || 0
      const eventVendorPaid = eventsSummary?.total_paid || 0
      const eventVendorPending = eventsSummary?.expenses_pending || 0
      const eventProfitMargin = eventsSummary?.total_profit || 0
      const eventCount = eventsSummary?.total_events || 0

      // Calculate totals based on booking type filter
      let totalRevenue = 0
      let paidRevenue = 0
      let pendingRevenue = 0
      let totalExpenses = expensesSummary?.total_amount || 0

      if (bookingType === 'hotel') {
        totalRevenue = hotelRevenue
        paidRevenue = hotelPaid
        pendingRevenue = hotelPending
      } else if (bookingType === 'events') {
        totalRevenue = eventRevenue
        paidRevenue = eventCollected
        pendingRevenue = eventPending
        // For events, vendor costs are the expenses
        totalExpenses = eventVendorCost
      } else {
        // Both
        totalRevenue = hotelRevenue + eventRevenue
        paidRevenue = hotelPaid + eventCollected
        pendingRevenue = hotelPending + eventPending
        // Add event vendor costs to expenses
        totalExpenses = (expensesSummary?.total_amount || 0) + eventVendorCost
      }

      // Calculate booking stats
      const bookingStats = {
        total: filteredBookings.length,
        confirmed: filteredBookings.filter((b: { status: string }) => b.status === 'Confirmed').length,
        checked_in: filteredBookings.filter((b: { status: string }) => b.status === 'Checked In').length,
        checked_out: filteredBookings.filter((b: { status: string }) => b.status === 'Checked Out').length,
        cancelled: filteredBookings.filter((b: { status: string }) => b.status === 'Cancelled').length,
      }

      // Get current occupancy (checked-in guests today)
      const today = formatDateForApi(new Date())
      const currentlyOccupied = bookings.filter((b: { status: string, check_in_date: string, check_out_date: string }) => {
        return b.status === 'Checked In' &&
               b.check_in_date.split('T')[0] <= today &&
               b.check_out_date.split('T')[0] >= today
      }).length

      const totalRooms = roomsSummary?.total_rooms || 0
      const activeRooms = roomsSummary?.active_rooms || 0

      setReportData({
        revenue: {
          total: totalRevenue,
          this_period: totalRevenue,
          paid: paidRevenue,
          pending: pendingRevenue,
          by_room_type: roomsSummary?.room_types || {}
        },
        occupancy: {
          rate: activeRooms > 0 ? (currentlyOccupied / activeRooms) * 100 : 0,
          total_rooms: totalRooms,
          occupied_rooms: currentlyOccupied,
          available_rooms: activeRooms - currentlyOccupied
        },
        bookings: bookingStats,
        expenses: {
          total: totalExpenses,
          paid: expensesSummary?.paid_amount || 0,
          pending: expensesSummary?.pending_amount || 0,
          total_due: expensesSummary?.total_due || 0,
          by_category: expensesSummary?.expense_by_category || {}
        },
        events: {
          total: eventCount,
          revenue: eventRevenue,
          collected: eventCollected,
          pending: eventPending,
          vendor_cost: eventVendorCost,
          vendor_paid: eventVendorPaid,
          vendor_pending: eventVendorPending,
          profit_margin: eventProfitMargin
        },
        profit: totalRevenue - totalExpenses
      })
    } catch (err) {
      console.error('Failed to fetch report data:', err)
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
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Overview of hotel performance and statistics</p>
        </div>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value as BookingTypeFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="both">Both (Hotel + Events)</option>
              <option value="hotel">Hotel Only</option>
              <option value="events">Events Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Period:</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value as typeof datePreset)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setDatePreset('custom')
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setDatePreset('custom')
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="ml-auto text-sm text-gray-500">
            Showing data from <span className="font-medium">{new Date(dateFrom).toLocaleDateString()}</span> to <span className="font-medium">{new Date(dateTo).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(reportData?.revenue.total || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-500 ml-2">from last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {reportData?.occupancy.rate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-5a2 2 0 012-2h2a2 2 0 012 2v5" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">{reportData?.occupancy.occupied_rooms} of {reportData?.occupancy.total_rooms} rooms occupied</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {reportData?.bookings.total || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{reportData?.bookings.confirmed}</span>
            <span className="text-gray-500 ml-1">confirmed</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(reportData?.expenses.total || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">This month: </span>
            <span className="text-red-600 font-medium ml-1">{formatCurrency(reportData?.expenses.total || 0)}</span>
          </div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Confirmed</span>
              </div>
              <span className="font-semibold">{reportData?.bookings.confirmed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Checked In</span>
              </div>
              <span className="font-semibold">{reportData?.bookings.checked_in || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                <span className="text-gray-700">Checked Out</span>
              </div>
              <span className="font-semibold">{reportData?.bookings.checked_out || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Cancelled</span>
              </div>
              <span className="font-semibold">{reportData?.bookings.cancelled || 0}</span>
            </div>
          </div>
        </div>

        {/* Room Availability */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Availability</h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative w-40 h-40">
              <svg className="transform -rotate-90 w-40 h-40">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${(reportData?.occupancy.rate || 0) * 4.4} 440`}
                  className="text-indigo-600"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{reportData?.occupancy.rate.toFixed(0)}%</span>
                <span className="text-sm text-gray-500">Occupied</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center space-x-8 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{reportData?.occupancy.available_rooms}</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{reportData?.occupancy.occupied_rooms}</p>
              <p className="text-sm text-gray-500">Occupied</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{reportData?.occupancy.total_rooms}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <div className="space-y-4">
            {Object.entries(reportData?.expenses.by_category || {}).map(([category, amount]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{category}</span>
                  <span className="text-sm font-medium">{formatCurrency(amount as number)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(((amount as number) / (reportData?.expenses.total || 1)) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(reportData?.expenses.by_category || {}).length === 0 && (
              <p className="text-gray-500 text-center py-4">No expense data available</p>
            )}
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-medium">Revenue Collected</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData?.revenue.paid || 0)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-yellow-800 font-medium">Revenue Pending</span>
                <span className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(reportData?.revenue.pending || 0)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-red-800 font-medium">Total Expenses</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(reportData?.expenses.total || 0)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-orange-800 font-medium">Outstanding Debt</span>
                <span className="text-2xl font-bold text-orange-600">
                  {formatCurrency(reportData?.expenses.total_due || 0)}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-medium text-lg">Net Profit/Loss</span>
                <span className={`text-2xl font-bold ${
                  (reportData?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(reportData?.profit || 0)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                (Revenue - Expenses for selected period)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Events Summary - Only shown when Events are included */}
      {(bookingType === 'both' || bookingType === 'events') && (reportData?.events.total || 0) > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Total Events</p>
              <p className="text-2xl font-bold text-purple-800">{reportData?.events.total || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Event Revenue</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(reportData?.events.revenue || 0)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Customer Collected</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(reportData?.events.collected || 0)}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Customer Pending</p>
              <p className="text-2xl font-bold text-yellow-800">{formatCurrency(reportData?.events.pending || 0)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Vendor Costs</p>
              <p className="text-2xl font-bold text-red-800">{formatCurrency(reportData?.events.vendor_cost || 0)}</p>
            </div>
            <div className="p-4 bg-teal-50 rounded-lg">
              <p className="text-sm text-teal-600 font-medium">Vendor Paid</p>
              <p className="text-2xl font-bold text-teal-800">{formatCurrency(reportData?.events.vendor_paid || 0)}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Vendor Pending</p>
              <p className="text-2xl font-bold text-orange-800">{formatCurrency(reportData?.events.vendor_pending || 0)}</p>
            </div>
            <div className={`p-4 rounded-lg ${(reportData?.events.profit_margin || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm font-medium ${(reportData?.events.profit_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Profit Margin
              </p>
              <p className={`text-2xl font-bold ${(reportData?.events.profit_margin || 0) >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatCurrency(reportData?.events.profit_margin || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}