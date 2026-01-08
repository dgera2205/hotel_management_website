'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface ServiceData {
  service_type: string
  custom_service_name: string
  customer_price: number
  vendor_cost: number
  vendor_name: string
  notes: string
}

const FIXED_SERVICES = [
  'Marriage Garden',
  'Rooms',
  'Tenting',
  'Electricity',
  'Generator',
  'Labour',
  'Event Services',
]

export default function NewEventPage() {
  const { token } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    booking_name: '',
    booking_date: '',
    contact_name: '',
    contact_phone: '+91 ',
    contact_email: '',
    notes: '',
  })

  // Initialize services with all fixed types
  const [services, setServices] = useState<ServiceData[]>(
    FIXED_SERVICES.map(type => ({
      service_type: type,
      custom_service_name: '',
      customer_price: 0,
      vendor_cost: 0,
      vendor_name: '',
      notes: '',
    }))
  )

  // Custom services
  const [customServices, setCustomServices] = useState<ServiceData[]>([])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleServiceChange = (index: number, field: keyof ServiceData, value: string | number) => {
    setServices(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleCustomServiceChange = (index: number, field: keyof ServiceData, value: string | number) => {
    setCustomServices(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addCustomService = () => {
    setCustomServices(prev => [
      ...prev,
      {
        service_type: 'Custom',
        custom_service_name: '',
        customer_price: 0,
        vendor_cost: 0,
        vendor_name: '',
        notes: '',
      },
    ])
  }

  const removeCustomService = (index: number) => {
    setCustomServices(prev => prev.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const allServices = [...services, ...customServices]
    const totalCustomerPrice = allServices.reduce((sum, s) => sum + s.customer_price, 0)
    const totalVendorCost = allServices.reduce((sum, s) => sum + s.vendor_cost, 0)
    const profit = totalCustomerPrice - totalVendorCost

    return { totalCustomerPrice, totalVendorCost, profit }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Combine fixed and custom services, filter out services with no pricing
      const allServices = [
        ...services.map(s => ({
          service_type: s.service_type.replace(' ', '_').toUpperCase().replace('MARRIAGE_GARDEN', 'MARRIAGE_GARDEN'),
          custom_service_name: null,
          customer_price: s.customer_price,
          vendor_cost: s.vendor_cost,
          vendor_name: s.vendor_name || null,
          notes: s.notes || null,
        })),
        ...customServices
          .filter(s => s.custom_service_name.trim() !== '')
          .map(s => ({
            service_type: 'CUSTOM',
            custom_service_name: s.custom_service_name,
            customer_price: s.customer_price,
            vendor_cost: s.vendor_cost,
            vendor_name: s.vendor_name || null,
            notes: s.notes || null,
          })),
      ]

      // Map service types to enum values
      const serviceTypeMap: Record<string, string> = {
        'MARRIAGE_GARDEN': 'Marriage Garden',
        'MARRIAGE GARDEN': 'Marriage Garden',
        'ROOMS': 'Rooms',
        'TENTING': 'Tenting',
        'ELECTRICITY': 'Electricity',
        'GENERATOR': 'Generator',
        'LABOUR': 'Labour',
        'EVENT_SERVICES': 'Event Services',
        'EVENT SERVICES': 'Event Services',
        'CUSTOM': 'Custom',
      }

      const mappedServices = allServices.map(s => ({
        ...s,
        service_type: serviceTypeMap[s.service_type.toUpperCase().replace(' ', '_')] || serviceTypeMap[s.service_type.toUpperCase()] || s.service_type,
      }))

      const submitData = {
        ...formData,
        services: mappedServices,
      }

      const response = await fetch(`${API_URL}/event-bookings/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create event')
      }

      router.push('/events')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Event Booking</h1>
          <p className="text-gray-600 mt-2">Create a new event booking with services</p>
        </div>
        <Link
          href="/events"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Events
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
          {/* Event Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Name *</label>
                <input
                  type="text"
                  name="booking_name"
                  required
                  value={formData.booking_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Sharma Wedding Reception"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Date *</label>
                <input
                  type="date"
                  name="booking_date"
                  required
                  value={formData.booking_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
                <input
                  type="text"
                  name="contact_name"
                  required
                  value={formData.contact_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="contact_phone"
                  required
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Services & Pricing</h2>
            <p className="text-sm text-gray-500 mb-4">Enter customer price (what you charge) and vendor cost (what you pay)</p>

            <div className="space-y-4">
              {/* Fixed Services */}
              {services.map((service, index) => (
                <div key={service.service_type} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-3">
                    <span className="text-sm font-medium text-gray-700">{service.service_type}</span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Customer Price</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-500 text-sm">&#8377;</span>
                      <input
                        type="number"
                        min="0"
                        value={service.customer_price || ''}
                        onChange={(e) => handleServiceChange(index, 'customer_price', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Vendor Cost</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-500 text-sm">&#8377;</span>
                      <input
                        type="number"
                        min="0"
                        value={service.vendor_cost || ''}
                        onChange={(e) => handleServiceChange(index, 'vendor_cost', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={service.vendor_name}
                      onChange={(e) => handleServiceChange(index, 'vendor_name', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Vendor name"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-gray-500">Margin: </span>
                    <span className={`text-sm font-medium ${service.customer_price - service.vendor_cost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(service.customer_price - service.vendor_cost)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Custom Services */}
              {customServices.map((service, index) => (
                <div key={`custom-${index}`} className="grid grid-cols-12 gap-3 items-center p-3 bg-indigo-50 rounded-lg">
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={service.custom_service_name}
                      onChange={(e) => handleCustomServiceChange(index, 'custom_service_name', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Service name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Customer Price</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-500 text-sm">&#8377;</span>
                      <input
                        type="number"
                        min="0"
                        value={service.customer_price || ''}
                        onChange={(e) => handleCustomServiceChange(index, 'customer_price', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Vendor Cost</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-500 text-sm">&#8377;</span>
                      <input
                        type="number"
                        min="0"
                        value={service.vendor_cost || ''}
                        onChange={(e) => handleCustomServiceChange(index, 'vendor_cost', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Vendor Name</label>
                    <input
                      type="text"
                      value={service.vendor_name}
                      onChange={(e) => handleCustomServiceChange(index, 'vendor_name', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Vendor name"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-medium ${service.customer_price - service.vendor_cost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(service.customer_price - service.vendor_cost)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustomService(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      &#10005;
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Custom Service Button */}
              <button
                type="button"
                onClick={addCustomService}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              >
                + Add Custom Service
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Any additional notes about the event..."
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>

            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.totalCustomerPrice)}</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Total Vendor Cost</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(totals.totalVendorCost)}</p>
              </div>

              <div className={`p-4 rounded-lg ${totals.profit >= 0 ? 'bg-indigo-50' : 'bg-orange-50'}`}>
                <p className={`text-sm ${totals.profit >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Expected Profit</p>
                <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                  {formatCurrency(totals.profit)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Creating Event...' : 'Create Event'}
              </button>
              <Link
                href="/events"
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
