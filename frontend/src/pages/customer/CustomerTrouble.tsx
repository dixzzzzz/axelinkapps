import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Home, 
  MapPin, 
  LogOut, 
  Send,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface TroubleReport {
  id: string;
  phone: string;
  issueType: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export default function CustomerTrouble() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<TroubleReport[]>([]);
  const navigate = useNavigate();

  const customerPhone = localStorage.getItem('customerPhone');

  const issueTypes = [
    { value: 'no-internet', label: 'No Internet Connection' },
    { value: 'slow-internet', label: 'Slow Internet Speed' },
    { value: 'wifi-issues', label: 'WiFi Connection Problems' },
    { value: 'device-offline', label: 'Device Offline' },
    { value: 'intermittent', label: 'Intermittent Connection' },
    { value: 'other', label: 'Other Issues' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer/trouble-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: customerPhone,
          issueType,
          description,
          contactName
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Trouble report submitted successfully');
        setIssueType('');
        setDescription('');
        setContactName('');
        loadReports();
      } else {
        toast.error(data.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting trouble report:', error);
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const response = await fetch(`/api/customer/trouble-reports/${customerPhone}`);
      const data = await response.json();

      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerPhone');
    localStorage.removeItem('customerSession');
    navigate('/customer/login');
  };

  React.useEffect(() => {
    if (!customerPhone) {
      navigate('/customer/login');
      return;
    }
    loadReports();
  }, [customerPhone, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'in-progress':
        return <AlertTriangle className="h-3 w-3" />;
      case 'resolved':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/img/logo.png" alt="Logo" className="h-12 w-auto rounded-lg shadow-sm" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Report Issue</h1>
                <p className="text-sm text-gray-600">Submit connectivity problems</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/customer/dashboard')}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/customer/map')}
                className="gap-2"
              >
                <MapPin className="h-4 w-4" />
                Device Location
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Submit New Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Submit New Issue Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={customerPhone || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactName">Contact Name (Optional)</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="issueType">Issue Type *</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Problem Description *
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  rows={4}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={loading || !issueType || !description.trim()}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Submit Report
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Report History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {issueTypes.find(t => t.value === report.issueType)?.label || report.issueType}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{report.description}</p>
                    {report.resolvedAt && (
                      <p className="text-xs text-green-600">
                        Resolved: {new Date(report.resolvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports submitted yet</p>
                <p className="text-sm">Submit your first issue report above</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            For urgent issues or if you need immediate assistance, please contact our support team directly via WhatsApp: {' '}
            <a 
              href="https://wa.me/6281911290961"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              081911290961
            </a>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}