import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import OTPInput from '@/components/OTPInput';
import { 
  Wifi, 
  Smartphone,
  Globe,
  ArrowRight,
  Zap,
  Shield,
  Headphones,
  AlertCircle,
  Phone,
  ArrowLeft
} from 'lucide-react';
import * as THREE from 'three';
import GLOBE from 'vanta/dist/vanta.globe.min';
import { VantaBackground } from '@/components/VantaBackgrounds';
import { useActionFlow } from '@/hooks/useActionFlow';

export default function CustomerLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { sendOTP, verifyOTP, authStep, pendingPhone, loading, error, resetAuth } = useCustomerAuth({ skipInitialCheck: true });
  const navigate = useNavigate();
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);
  const sendOtpFlow = useActionFlow<void>();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await sendOtpFlow.start(
        async () => {
          await sendOTP(phone);
        },
        {
          minRequestMs: 700,
          minProcessingMs: 1000,
          processingLabel: 'Sending WhatsApp message...'
        }
      );
      // OTP phase will be shown by authStep change
    } catch (err) {
      // Error already captured by hook and UI error block
    }
  };

  const handleOTPVerificationSuccess = (phone: string) => {
      // console.log('✅ OTP verification successful for:', phone);
    navigate('/customer');
  };

  const handleBackToPhone = () => {
    resetAuth();
    setOtp('');
    setCountdown(60);
    setCanResend(false);
  };

  // Initialize Vanta.js effect
  useEffect(() => {
    if (!vantaEffect.current && vantaRef.current) {
      vantaEffect.current = GLOBE({
        el: vantaRef.current,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0xe879f9, // purple-300 (even brighter purple)
        color2: 0xa5b4fc, // indigo-300 (even brighter indigo)
        backgroundColor: 0x312e81, // indigo-800 (much lighter background)
        size: 1.20,
        zoom: 1.25,
        // Fix THREE.js warnings
        vertexColors: false,
        wireframe: false
      });
    }
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (authStep === 'otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (authStep === 'otp' && countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, authStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  // OTP handlers
  const handleOTPChange = (value: string) => {
    setOtp(value);
  };



  const handleVerifyOTP = async (otpCode: string) => {
    if (otpCode.length !== 6 || !pendingPhone) return;

    setOtpLoading(true);

    try {
      await verifyOTP(pendingPhone, otpCode);
      handleOTPVerificationSuccess(pendingPhone);
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      setOtp(''); // Clear OTP input
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!pendingPhone) return;
    
    try {
      await sendOTP(pendingPhone);
      setCountdown(60);
      setCanResend(false);
      setOtp('');
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    if (phone.length > 4) {
      return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
    }
    return phone;
  };

  // OTP verification form content
  const renderOTPForm = () => (
    <Card className="bg-white/99 backdrop-blur-2xl border-white/60 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/20" style={{ backgroundColor: '#ffffff' }}>
      <CardHeader className="text-center pb-8 pt-10">
        <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 mb-2" style={{ color: '#000000 !important' }}>
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span style={{ color: '#000000 !important', textShadow: 'none', filter: 'none' }}>Verify OTP</span>
        </CardTitle>
        <div className="text-lg font-medium text-center" style={{ color: '#1f2937 !important', textShadow: 'none' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="h-5 w-5" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            <span style={{ color: '#10b981' }}>Sent via WhatsApp</span>
          </div>
          <p>We've sent a 6-digit verification code to {formatPhoneNumber(pendingPhone || '')}</p>
        </div>
      </CardHeader>
      <CardContent className="px-10 pb-10">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
          </Alert>
        )}
        
        
              <div className="space-y-4 lg:space-y-6">
                {/* Phone input group */}
                <div className="space-y-3 lg:space-y-4">
            <Label className="text-base font-semibold" style={{ color: '#111827 !important', textShadow: 'none' }}>
              Enter Verification Code
            </Label>
            <div className="flex justify-center">
              <OTPInput
                value={otp}
                onChange={handleOTPChange}
                disabled={otpLoading}
                error={!!error}
              />
            </div>
          </div>

          {/* Verify Button */}
          <Button 
            onClick={() => handleVerifyOTP(otp)}
            disabled={otpLoading || otp.length !== 6}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            {otpLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Verifying...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                Verify Code
                <Shield className="h-5 w-5" />
              </div>
            )}
          </Button>
        </div>

        {/* Resend Section */}
        <div className="space-y-4 mt-8">
          <div className="text-center">
            <p className="font-medium mb-3" style={{ color: '#374151 !important', textShadow: 'none' }}>
              Didn't receive the code?
            </p>
            
            {canResend ? (
              <Button
                onClick={handleResendOTP}
                variant="outline"
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                Resend Code
              </Button>
            ) : (
              <p className="text-sm" style={{ color: '#6b7280 !important' }}>
                Resend code in <span className="font-semibold text-indigo-600">{countdown}s</span>
              </p>
            )}
          </div>
          
          <div className="text-center">
            <Button
              onClick={handleBackToPhone}
              variant="ghost"
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Change Phone Number
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      {/* Vanta.js Background */}
      <VantaBackground effect="globe" />
      <div 
        ref={vantaRef}
        className="absolute inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Overlay for better content readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-purple-900/15 to-indigo-900/20 z-10"></div>
      <div className="absolute inset-0 bg-black/5 z-10"></div>

      <div className="relative z-20 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 lg:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4 lg:mb-6">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl">
              <Smartphone className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-7xl font-bold bg-gradient-to-r from-white via-purple-100 to-indigo-100 bg-clip-text text-transparent mb-4 lg:mb-6 drop-shadow-lg">
            Customer Portal
          </h1>
          <p className="text-lg lg:text-2xl text-white max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Access your internet service account with secure OTP verification
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Customer Features Section */}
          <div className="space-y-4 lg:space-y-8 order-1 lg:order-1">
            <div className="grid grid-cols-1 gap-3 lg:gap-6">
              <Card className="bg-white/25 backdrop-blur-xl border-white/20 text-white shadow-2xl hover:from-blue-400/30 hover:to-indigo-500/30 transition-all duration-300 hover:transform hover:scale-105 ring-1 ring-white/20">
                <CardContent className="p-4 lg:p-8">
                  <div className="flex items-center gap-3 lg:gap-5">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                      <Wifi className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg lg:text-xl mb-1 text-white drop-shadow-sm">WiFi Management</h3>
                      <p className="text-white/95 text-sm lg:text-base leading-relaxed drop-shadow-sm">Change WiFi name and password with just a few clicks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/25 backdrop-blur-xl border-white/20 text-white shadow-2xl hover:from-blue-400/30 hover:to-indigo-500/30 transition-all duration-300 hover:transform hover:scale-105 ring-1 ring-white/20">
                <CardContent className="p-4 lg:p-8">
                  <div className="flex items-center gap-3 lg:gap-5">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                      <Zap className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg lg:text-xl mb-1 text-white drop-shadow-sm">Service Status</h3>
                      <p className="text-white/95 text-sm lg:text-base leading-relaxed drop-shadow-sm">Monitor your connection and device status in real-time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/25 backdrop-blur-xl border-white/20 text-white shadow-2xl hover:from-blue-400/30 hover:to-indigo-500/30 transition-all duration-300 hover:transform hover:scale-105 ring-1 ring-white/20">
                <CardContent className="p-4 lg:p-8">
                  <div className="flex items-center gap-3 lg:gap-5">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                      <Headphones className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg lg:text-xl mb-1 text-white drop-shadow-sm">Support Center</h3>
                      <p className="text-white/95 text-sm lg:text-base leading-relaxed drop-shadow-sm">Get instant help and report issues 24/7</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Benefits Badges */}
            <div className="flex flex-wrap gap-2 lg:gap-3 justify-center lg:justify-start">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/40 px-3 py-1 lg:px-4 lg:py-2 backdrop-blur-sm drop-shadow-sm text-sm">
                <Smartphone className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                Self Service
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/40 px-3 py-1 lg:px-4 lg:py-2 backdrop-blur-sm drop-shadow-sm text-sm">
                <Globe className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                24/7 Access
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/40 px-3 py-1 lg:px-4 lg:py-2 backdrop-blur-sm drop-shadow-sm text-sm">
                <Shield className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                Secure OTP
              </Badge>
            </div>
          </div>

          {/* Customer Login/OTP Form */}
          <div className="order-2 lg:order-2">
          {authStep === 'otp' && pendingPhone ? renderOTPForm() : (
          <Card className="bg-white/99 backdrop-blur-2xl border-white/60 shadow-2xl rounded-2xl lg:rounded-3xl overflow-hidden ring-1 ring-white/20" style={{ backgroundColor: '#ffffff' }}>
            <CardHeader className="text-center pb-6 pt-6 lg:pb-8 lg:pt-10">
              <CardTitle className="text-2xl lg:text-3xl font-bold flex items-center justify-center gap-3 mb-2" style={{ color: '#000000 !important' }}>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl lg:rounded-2xl flex items-center justify-center">
                  <Smartphone className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <span style={{ color: '#000000 !important', textShadow: 'none', filter: 'none' }}>Customer Login</span>
              </CardTitle>
              <CardDescription className="text-base lg:text-lg font-medium" style={{ color: '#1f2937 !important', textShadow: 'none' }}>Sign in with OTP verification to access your account</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 lg:px-10 lg:pb-10">
              <form onSubmit={handleSendOTP} className="space-y-6 lg:space-y-8">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-3 lg:space-y-4">
                  <Label htmlFor="customer-login" className="text-base font-semibold" style={{ color: '#111827 !important', textShadow: 'none' }}>
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                    <Input 
                      id="customer-login" 
                      type="tel"
                      placeholder="Enter your phone number (e.g. 081234567890)"
                      className="h-12 lg:h-14 pl-10 lg:pl-12 text-sm lg:text-base border-2 border-gray-200 rounded-lg lg:rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/25 transition-all duration-300"
                      style={{ color: '#111827 !important', backgroundColor: '#ffffff', textShadow: 'none' }}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg lg:rounded-xl p-3 lg:p-4">
                    <p className="text-xs lg:text-sm flex items-center gap-2" style={{ color: '#059669' }}>
                      <svg className="h-4 w-4" style={{ color: '#059669' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                    </svg>
                    We'll send a secure OTP code via WhatsApp to verify your identity
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit"
                  className="w-full h-12 lg:h-14 text-base lg:text-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                  disabled={loading || sendOtpFlow.state.phase === 'requesting' || sendOtpFlow.state.phase === 'processing'}
                >
                  {sendOtpFlow.state.phase === 'requesting' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending OTP...
                    </div>
                  ) : sendOtpFlow.state.phase === 'processing' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {sendOtpFlow.state.processingLabel || 'Processing...'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      Send OTP Code
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6 lg:mt-8 text-center">
                <p className="text-sm lg:text-base font-medium" style={{ color: '#374151 !important', textShadow: 'none' }}>
                  Need help? Contact your service provider for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-white">
          <p className="text-lg drop-shadow-md">© 2025 Powered by AxeLink</p>
          <p className="text-sm mt-2 opacity-90 drop-shadow-sm">Secure • Reliable • Always Connected</p>
        </div>
      </div>
    </div>
  );
}

