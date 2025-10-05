import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, isFirstLogin } = location.state || {};
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      isValid: minLength && hasUpper && hasLower && hasNumber
    };
  };

  const passwordValidation = validatePassword(passwords.new);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!passwordValidation.isValid) {
      setError('Please meet all password requirements');
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to customer dashboard after successful password change
      navigate('/customer/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex flex-col items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-4">
            {isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </h1>
          <p className="text-lg text-blue-100">
            {isFirstLogin 
              ? 'Welcome! Please create a secure password for your account.' 
              : 'Update your account password for better security.'
            }
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-slate-800 flex items-center justify-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Password Security
            </CardTitle>
            <CardDescription>
              {email && `Updating password for: ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isFirstLogin && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This is your first login. Please create a new secure password to continue.
                  </AlertDescription>
                </Alert>
              )}
              
              {!isFirstLogin && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="current-password" 
                      type={showPasswords.current ? "text" : "password"}
                      placeholder="Enter current password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                      className="h-12 pl-10 pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="new-password" 
                    type={showPasswords.new ? "text" : "password"}
                    placeholder="Enter new password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    className="h-12 pl-10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirm-password" 
                    type={showPasswords.confirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    className="h-12 pl-10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-50 border rounded-lg p-4">
                <h4 className="font-medium text-sm mb-3">Password Requirements:</h4>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle className={`h-4 w-4 ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-400'}`} />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasUpper ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle className={`h-4 w-4 ${passwordValidation.hasUpper ? 'text-green-600' : 'text-gray-400'}`} />
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasLower ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle className={`h-4 w-4 ${passwordValidation.hasLower ? 'text-green-600' : 'text-gray-400'}`} />
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <CheckCircle className={`h-4 w-4 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-400'}`} />
                    One number
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading || !passwordValidation.isValid}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Updating Password...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isFirstLogin ? 'Set Password & Continue' : 'Update Password'}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-blue-200">
          <p>© 2025 AxeApps - Powered by Axelink</p>
        </div>
      </div>
    </div>
  );
}