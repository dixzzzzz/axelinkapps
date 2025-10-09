import Swal from 'sweetalert2';

// Default SweetAlert2 configuration with modern styling
const defaultSwalConfig = {
  background: '#ffffff',
  color: '#374151',
  confirmButtonColor: '#3B82F6',
  cancelButtonColor: '#6B7280',
  showClass: {
    popup: 'animate__animated animate__fadeInUp animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutDown animate__faster'
  },
  customClass: {
    popup: 'shadow-2xl border-0 rounded-2xl',
    title: 'text-xl font-bold text-gray-800',
    content: 'text-gray-600',
    confirmButton: 'px-6 py-2.5 rounded-lg font-medium shadow-lg transition-all duration-200 hover:scale-105',
    cancelButton: 'px-6 py-2.5 rounded-lg font-medium shadow-lg transition-all duration-200 hover:scale-105'
  }
};

export const modernSwal = Swal.mixin(defaultSwalConfig);

// Success notification for WiFi SSID changes
export const showSSIDSuccessPopup = async (type: '2g' | '5g', ssid: string, message: string) => {
  return await modernSwal.fire({
    title: `WiFi ${type.toUpperCase()} SSID Updated!`,
    html: `
      <div class="text-center">
        <div class="mb-4">
          <svg class="mx-auto h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
          </svg>
        </div>
        <p class="text-gray-600 mb-3">${message}</p>
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <p class="text-sm font-medium text-gray-700 mb-1">New SSID Name:</p>
          <p class="text-lg font-bold text-blue-600">${ssid}</p>
        </div>
        <div class="mt-3 text-xs text-gray-500">
          💡 Your connected devices may need to reconnect with the new network name
        </div>
      </div>
    `,
    icon: 'success',
    confirmButtonText: '🎉 Perfect!',
    confirmButtonColor: '#3B82F6',
    timer: 8000,
    timerProgressBar: true,
    showCloseButton: true
  });
};

// Success notification for WiFi password changes  
export const showPasswordSuccessPopup = async (type: '2g' | '5g', password: string, message: string) => {
  const securityLevel = password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : 'Weak';
  const securityIcon = password.length >= 12 ? '🛡️' : password.length >= 8 ? '🔐' : '⚠️';
  const securityColor = password.length >= 12 ? 'text-green-600' : password.length >= 8 ? 'text-blue-600' : 'text-orange-600';
  
  return await modernSwal.fire({
    title: `WiFi ${type.toUpperCase()} Password Updated!`,
    html: `
      <div class="text-center">
        <div class="mb-4">
          <svg class="mx-auto h-16 w-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <p class="text-gray-600 mb-3">${message}</p>
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
          <p class="text-sm font-medium text-gray-700 mb-1">Security Status:</p>
          <p class="text-lg font-bold ${securityColor}">
            ${securityIcon} ${securityLevel}
          </p>
          <p class="text-xs text-gray-500 mt-2">
            Password length: ${password.length} characters
          </p>
        </div>
        <div class="mt-3 text-xs text-gray-500">
          🔒 All connected devices will need the new password to reconnect
        </div>
      </div>
    `,
    icon: 'success',
    confirmButtonText: '🔐 Secure!',
    confirmButtonColor: '#8B5CF6',
    timer: 8000,
    timerProgressBar: true,
    showCloseButton: true
  });
};

// Success notification for device restart
export const showRestartSuccessPopup = async (message: string) => {
  return await modernSwal.fire({
    title: '🔄 Device Restart Initiated!',
    html: `
      <div class="text-center">
        <div class="mb-4">
          <svg class="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <p class="text-gray-600 mb-3">${message}</p>
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div class="flex items-center justify-center mb-2">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mr-3"></div>
            <p class="text-sm font-medium text-gray-700">Restarting device...</p>
          </div>
          <p class="text-xs text-gray-500">Estimated time: 2-3 minutes</p>
        </div>
        <div class="mt-3 text-xs text-gray-500">
          ⏱️ Your internet will be briefly offline during the restart process
        </div>
      </div>
    `,
    icon: 'success',
    confirmButtonText: '✅ Got it!',
    confirmButtonColor: '#10B981',
    timer: 10000,
    timerProgressBar: true,
    showCloseButton: true
  });
};

// Error notification
export const showErrorPopup = async (title: string, message: string) => {
  return await modernSwal.fire({
    title: title,
    text: message,
    icon: 'error',
    confirmButtonText: 'Try Again',
    confirmButtonColor: '#EF4444'
  });
};

// Warning notification
export const showWarningPopup = async (title: string, message: string, showCancel = false) => {
  return await modernSwal.fire({
    title: title,
    text: message,
    icon: 'warning',
    confirmButtonText: showCancel ? 'Continue' : 'OK',
    confirmButtonColor: '#F59E0B',
    ...(showCancel && {
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6B7280'
    })
  });
};

// Input validation popup
export const showValidationPopup = async (title: string, message: string) => {
  return await modernSwal.fire({
    title: title,
    text: message,
    icon: 'warning',
    confirmButtonText: 'OK',
    confirmButtonColor: '#F59E0B'
  });
};
