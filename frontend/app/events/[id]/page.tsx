'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface VendorPayment {
  id: number
  payment_date: string
  amount: number
  payment_mode: string | null
  notes: string | null
}

interface Service {
  id: number
  service_type: string
  custom_service_name: string | null
  customer_price: number
  vendor_cost: number
  vendor_name: string | null
  notes: string | null
  vendor_total_paid: number
  vendor_pending: number
  vendor_payments: VendorPayment[]
}

interface CustomerPayment {
  id: number
  payment_date: string
  amount: number
  payment_mode: string | null
  notes: string | null
}

interface EventBooking {
  id: number
  booking_name: string
  booking_date: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  status: string
  notes: string | null
  services: Service[]
  customer_payments: CustomerPayment[]
  total_customer_price: number
  total_collected: number
  customer_pending: number
  total_vendor_cost: number
  total_vendor_paid: number
  vendor_pending: number
  profit_margin: number
}

export default function EventDetailPage() {
  const { token } = useAuth()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<EventBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit mode states
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  // Modal states
  const [showCustomerPaymentModal, setShowCustomerPaymentModal] = useState(false)
  const [showVendorPaymentModal, setShowVendorPaymentModal] = useState<number | null>(null)
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)

  // Payment form states
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Service form states
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceCustomerPrice, setNewServiceCustomerPrice] = useState('')
  const [newServiceVendorCost, setNewServiceVendorCost] = useState('')
  const [newServiceVendorName, setNewServiceVendorName] = useState('')

  // Expanded vendor payments
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchEvent()
  }, [eventId, token])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/event-bookings/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEvent(data)
      } else {
        setError('Failed to fetch event')
      }
    } catch (err) {
      setError('Failed to fetch event')
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const saveField = async (field: string, value: string) => {
    if (!event) return
    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        await fetchEvent()
        setEditingField(null)
      } else {
        alert('Failed to save')
      }
    } catch (err) {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateService = async (serviceId: number, field: string, value: number | string) => {
    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        await fetchEvent()
      } else {
        alert('Failed to update service')
      }
    } catch (err) {
      alert('Failed to update service')
    } finally {
      setSaving(false)
    }
  }

  const addCustomerPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}/customer-payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_date: paymentDate,
          amount: parseFloat(paymentAmount),
          payment_mode: paymentMode,
          notes: paymentNotes || null,
        }),
      })

      if (response.ok) {
        await fetchEvent()
        setShowCustomerPaymentModal(false)
        resetPaymentForm()
      } else {
        alert('Failed to add payment')
      }
    } catch (err) {
      alert('Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const addVendorPayment = async (serviceId: number) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}/services/${serviceId}/vendor-payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_date: paymentDate,
          amount: parseFloat(paymentAmount),
          payment_mode: paymentMode,
          notes: paymentNotes || null,
        }),
      })

      if (response.ok) {
        await fetchEvent()
        setShowVendorPaymentModal(null)
        resetPaymentForm()
      } else {
        alert('Failed to add payment')
      }
    } catch (err) {
      alert('Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const addService = async () => {
    if (!newServiceName.trim()) {
      alert('Please enter a service name')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_type: 'Custom',
          custom_service_name: newServiceName,
          customer_price: parseFloat(newServiceCustomerPrice) || 0,
          vendor_cost: parseFloat(newServiceVendorCost) || 0,
          vendor_name: newServiceVendorName || null,
        }),
      })

      if (response.ok) {
        await fetchEvent()
        setShowAddServiceModal(false)
        setNewServiceName('')
        setNewServiceCustomerPrice('')
        setNewServiceVendorCost('')
        setNewServiceVendorName('')
      } else {
        alert('Failed to add service')
      }
    } catch (err) {
      alert('Failed to add service')
    } finally {
      setSaving(false)
    }
  }

  const deleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to remove this service?')) return

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchEvent()
      } else {
        alert('Failed to remove service')
      }
    } catch (err) {
      alert('Failed to remove service')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        await fetchEvent()
      } else {
        alert('Failed to update status')
      }
    } catch (err) {
      alert('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return

    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/event-bookings/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        router.push('/events')
      } else {
        const data = await response.json()
        alert(data.detail || 'Failed to delete event')
      }
    } catch (err) {
      alert('Failed to delete event')
    } finally {
      setSaving(false)
    }
  }

  const resetPaymentForm = () => {
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentAmount('')
    setPaymentMode('Cash')
    setPaymentNotes('')
  }

  const toggleServiceExpand = (serviceId: number) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId)
      } else {
        newSet.add(serviceId)
      }
      return newSet
    })
  }

  const getServiceDisplayName = (service: Service): string => {
    if (service.service_type === 'Custom') {
      return service.custom_service_name || 'Custom Service'
    }
    return service.service_type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-red-600">{error || 'Event not found'}</h3>
        <Link href="/events" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
          Back to Events
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            {editingField === 'booking_name' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveField('booking_name', editValue)}
                onKeyDown={(e) => e.key === 'Enter' && saveField('booking_name', editValue)}
                className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <h1
                className="text-3xl font-bold text-gray-900 cursor-pointer hover:text-indigo-600"
                onClick={() => {
                  setEditingField('booking_name')
                  setEditValue(event.booking_name)
                }}
              >
                {event.booking_name}
              </h1>
            )}
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(event.status)}`}>
              {event.status}
            </span>
          </div>
          <p className="text-gray-600 mt-2">Event Date: {formatDate(event.booking_date)}</p>
        </div>
        <Link
          href="/events"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Events
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500">Name</label>
                {editingField === 'contact_name' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveField('contact_name', editValue)}
                    className="w-full text-gray-900 border-b border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-gray-900 cursor-pointer hover:text-indigo-600"
                    onClick={() => {
                      setEditingField('contact_name')
                      setEditValue(event.contact_name)
                    }}
                  >
                    {event.contact_name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-500">Phone</label>
                {editingField === 'contact_phone' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveField('contact_phone', editValue)}
                    className="w-full text-gray-900 border-b border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-gray-900 cursor-pointer hover:text-indigo-600"
                    onClick={() => {
                      setEditingField('contact_phone')
                      setEditValue(event.contact_phone)
                    }}
                  >
                    {event.contact_phone}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-500">Email</label>
                {editingField === 'contact_email' ? (
                  <input
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveField('contact_email', editValue)}
                    className="w-full text-gray-900 border-b border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-gray-900 cursor-pointer hover:text-indigo-600"
                    onClick={() => {
                      setEditingField('contact_email')
                      setEditValue(event.contact_email || '')
                    }}
                  >
                    {event.contact_email || 'Click to add email'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Services</h2>
              <button
                onClick={() => setShowAddServiceModal(true)}
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded"
              >
                + Add Service
              </button>
            </div>

            <div className="space-y-3">
              {event.services.map((service) => (
                <div key={service.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleServiceExpand(service.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {expandedServices.has(service.id) ? '▼' : '▶'}
                        </button>
                        <span className="font-medium text-gray-900">{getServiceDisplayName(service)}</span>
                        {service.vendor_name && (
                          <span className="text-sm text-gray-500">({service.vendor_name})</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-3">
                    <div>
                      <label className="block text-xs text-gray-500">Customer Price</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-gray-500 text-sm">&#8377;</span>
                        <input
                          type="number"
                          value={service.customer_price}
                          onChange={(e) => updateService(service.id, 'customer_price', parseFloat(e.target.value) || 0)}
                          className="w-full pl-6 pr-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Vendor Cost</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-gray-500 text-sm">&#8377;</span>
                        <input
                          type="number"
                          value={service.vendor_cost}
                          onChange={(e) => updateService(service.id, 'vendor_cost', parseFloat(e.target.value) || 0)}
                          className="w-full pl-6 pr-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Vendor Paid</label>
                      <p className="text-sm text-green-600 font-medium py-1">{formatCurrency(service.vendor_total_paid)}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Vendor Pending</label>
                      <p className="text-sm text-orange-600 font-medium py-1">{formatCurrency(service.vendor_pending)}</p>
                    </div>
                  </div>

                  {/* Expanded vendor payments */}
                  {expandedServices.has(service.id) && (
                    <div className="mt-4 pl-6 border-l-2 border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Vendor Payments</h4>
                        <button
                          onClick={() => {
                            resetPaymentForm()
                            setShowVendorPaymentModal(service.id)
                          }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                        >
                          + Add Payment
                        </button>
                      </div>
                      {service.vendor_payments.length === 0 ? (
                        <p className="text-sm text-gray-500">No payments recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {service.vendor_payments.map((payment) => (
                            <div key={payment.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                              <span>{formatDate(payment.payment_date)}</span>
                              <span className="font-medium">{formatCurrency(payment.amount)}</span>
                              <span className="text-gray-500">{payment.payment_mode}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Payments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Customer Payments</h2>
              <button
                onClick={() => {
                  resetPaymentForm()
                  setShowCustomerPaymentModal(true)
                }}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
              >
                + Collect Payment
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(event.total_customer_price)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Collected</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(event.total_collected)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(event.customer_pending)}</p>
              </div>
            </div>

            {event.customer_payments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No payments collected yet</p>
            ) : (
              <div className="space-y-2">
                {event.customer_payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{formatDate(payment.payment_date)}</span>
                      <span className="text-gray-500 ml-2">({payment.payment_mode})</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              value={event.notes || ''}
              onChange={(e) => {
                // Debounce the save
                const value = e.target.value
                setEvent(prev => prev ? { ...prev, notes: value } : null)
              }}
              onBlur={(e) => saveField('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Add notes about the event..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>

            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(event.total_customer_price)}</p>
                <div className="mt-2 text-sm">
                  <span className="text-green-600">Collected: {formatCurrency(event.total_collected)}</span>
                  <span className="text-orange-600 ml-2">Pending: {formatCurrency(event.customer_pending)}</span>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Total Vendor Cost</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(event.total_vendor_cost)}</p>
                <div className="mt-2 text-sm">
                  <span className="text-green-600">Paid: {formatCurrency(event.total_vendor_paid)}</span>
                  <span className="text-orange-600 ml-2">Pending: {formatCurrency(event.vendor_pending)}</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${event.profit_margin >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
                <p className={`text-sm ${event.profit_margin >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Profit Margin</p>
                <p className={`text-2xl font-bold ${event.profit_margin >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                  {formatCurrency(event.profit_margin)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {event.status === 'Confirmed' && (
                <button
                  onClick={() => updateStatus('Completed')}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
                >
                  Mark as Completed
                </button>
              )}
              {event.status === 'Confirmed' && (
                <button
                  onClick={() => updateStatus('Cancelled')}
                  disabled={saving}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-medium"
                >
                  Cancel Event
                </button>
              )}
              {event.status === 'Cancelled' && (
                <button
                  onClick={deleteEvent}
                  disabled={saving}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium"
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Payment Modal */}
      {showCustomerPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Collect Customer Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">&#8377;</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomerPaymentModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addCustomerPayment}
                disabled={saving}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {saving ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Payment Modal */}
      {showVendorPaymentModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Record Vendor Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">&#8377;</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowVendorPaymentModal(null)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => addVendorPayment(showVendorPaymentModal)}
                disabled={saving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {saving ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Add Custom Service</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Decoration"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">&#8377;</span>
                  <input
                    type="number"
                    value={newServiceCustomerPrice}
                    onChange={(e) => setNewServiceCustomerPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">&#8377;</span>
                  <input
                    type="number"
                    value={newServiceVendorCost}
                    onChange={(e) => setNewServiceVendorCost(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={newServiceVendorName}
                  onChange={(e) => setNewServiceVendorName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddServiceModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addService}
                disabled={saving}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {saving ? 'Adding...' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
