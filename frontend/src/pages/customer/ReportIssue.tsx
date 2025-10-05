import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';

interface ReportFormData {
  name: string;
  phone: string;
  location: string;
  category: string;
  description: string;
}

interface ReportResponse {
  success: boolean;
  message: string;
  reportId?: string;
}

const ISSUE_CATEGORIES = [
  'Internet Lambat',
  'Tidak Bisa Browsing', 
  'WiFi Tidak Muncul',
  'Koneksi Putus-Putus',
  'Lainnya'
];

export default function ReportIssue() {
  const navigate = useNavigate();
  const { user } = useCustomerAuth();
  
  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    phone: '',
    location: '',
    category: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ReportFormData>>({});

  // Keep form fields empty by default
  // useEffect(() => {
  //   if (user) {
  //     setFormData(prev => ({
  //       ...prev,
  //       name: user.name || '',
  //       phone: user.phone || ''
  //     }));
  //   }
  // }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ReportFormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name as keyof ReportFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Validation',
        text: 'Please fill in all required fields'
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🎫 Submitting trouble report:', formData);

      // Primary endpoint - POST to /api/customer/trouble/report  
      let response: Response;
      let data: ReportResponse;

      try {
        response = await fetch('/api/customer/trouble/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData)
        });

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error('Non-JSON response, possibly invalid session');
        }
      } catch (err) {
        console.warn('⚠️ Primary endpoint failed, trying fallback:', err);
        
        // Fallback endpoint - GET with query params
        const params = new URLSearchParams(formData);
        response = await fetch(`/api/customer/trouble/test?${params.toString()}`, {
          credentials: 'include'
        });
        data = await response.json();
      }

      if (data.success) {
        // Success feedback with ticket ID
        await Swal.fire({
          icon: 'success',
          title: 'Report Submitted Successfully!',
          html: `
            <div class="text-left">
              <p><strong>Message:</strong> ${data.message}</p>
              ${data.reportId ? `<p><strong>Ticket ID:</strong> ${data.reportId}</p>` : ''}
              <p><small>You will be redirected to the dashboard in 3 seconds...</small></p>
            </div>
          `,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });

        // Reset form
        setFormData({
          name: '',
          phone: '',
          location: '',
          category: '',
          description: ''
        });

        // Redirect to dashboard
        navigate('/customer/dashboard');
      } else {
        throw new Error(data.message || 'Failed to submit report');
      }

    } catch (error) {
      console.error('❌ Error submitting report:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error instanceof Error ? error.message : 'Failed to submit report. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Glass Container */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
            Report Issue
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 ${
                  errors.phone 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Location Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 ${
                  errors.location 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="Enter your location/address"
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>

            {/* Category Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Issue Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 bg-white ${
                  errors.category 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
              >
                <option value="">Choose Category</option>
                {ISSUE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Issue Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 resize-none ${
                  errors.description 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
                placeholder="Describe your issue in detail..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting Report...
                </div>
              ) : (
                'Submit Report'
              )}
            </button>
          </form>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="inline-flex items-center px-6 py-2 border-2 border-gray-300 rounded-xl text-gray-600 hover:text-gray-800 hover:border-gray-400 transition-all duration-300 hover:-translate-y-1"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
