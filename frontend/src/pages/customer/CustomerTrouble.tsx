import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
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
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface TroubleReportNote {
  timestamp: string;
  content: string;
  status?: string; // backend may include backend status keyword
  notificationSent?: boolean;
}

interface TroubleReport {
  id: string;
  phone: string;
  issueType: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved';
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  statusRaw?: 'open' | 'in_progress' | 'resolved' | 'closed';
  statusLabel?: string; // Indonesian label supplied by backend
  notes?: TroubleReportNote[];
}

export default function CustomerTrouble() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<TroubleReport[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { user } = useCustomerAuth({ skipInitialCheck: false });

  const customerPhone = user?.phone || localStorage.getItem('customerPhone') || '';

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
        credentials: 'include',
        body: JSON.stringify({
          phone: customerPhone,
          issueType,
          description,
          contactName,
          ...(location && { location })
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Trouble report submitted successfully');
        setIssueType('');
        setDescription('');
        setContactName('');
        setLocation('');
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
      const response = await fetch(`/api/customer/trouble-reports/${customerPhone}` , { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('customerPhone');
    localStorage.removeItem('customerSession');
    navigate('/customer/login');
  };

  React.useEffect(() => {
    if (!customerPhone) return; // ProtectedRoute already handles login redirect
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, [customerPhone]);

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

  const getNoteStatusLabel = (status?: string) => {
    switch (status) {
      case 'open':
        return 'Belum Ditangani';
      case 'in_progress':
        return 'Sedang Ditangani';
      case 'resolved':
        return 'Terselesaikan';
      case 'closed':
        return 'Ditutup';
      default:
        return undefined;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Page Header - Card-like design with requested text */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
                Trouble Reports
              </h1>
              <p className="text-white/90 text-sm sm:text-base">
                Report history and handling status
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit New Report */}
        <Card className="shadow-xl border-0 bg-white backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-red-50">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-800">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Submit New Issue Report
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Fixed form alignment - ensure equal heights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={customerPhone || ''}
                    disabled
                    className="bg-gray-50 text-sm h-11 border-gray-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactName" className="text-sm font-medium text-gray-700 block">
                    Contact Name (Optional)
                  </Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your name"
                    className="text-sm h-11 border-gray-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueType" className="text-sm font-medium text-gray-700">Issue Type *</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger className="text-sm h-11 border-gray-200">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-sm">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Field */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                  Location (Optional)
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter your location/address"
                  className="text-sm h-11 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                  Problem Description *
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  rows={3}
                  required
                  className="text-sm resize-none border-gray-200"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 py-3 text-sm font-medium shadow-lg transition-all duration-200 rounded-xl"
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
        <Card className="shadow-xl border-0 bg-white backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-800">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Report History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Total reports: <span className="font-medium text-gray-800">{reports.length}</span>
              </p>
              <Button variant="outline" size="sm" onClick={loadReports} className="text-xs sm:text-sm border-gray-200 hover:bg-gray-50">
                Refresh
              </Button>
            </div>
            
            {reports.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm sm:text-base leading-tight text-gray-800">
                          {issueTypes.find(t => t.value === report.issueType)?.label || report.issueType}
                        </h3>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1 space-y-1">
                          <div>Dibuat: {new Date(report.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</div>
                          {report.updatedAt && (
                            <div>Diperbarui: {new Date(report.updatedAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric', 
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</div>
                          )}
                        </div>
                      </div>
                      <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span className="hidden sm:inline">
                          {report.statusLabel || (report.status.charAt(0).toUpperCase() + report.status.slice(1))}
                        </span>
                        <span className="sm:hidden">
                          {report.statusLabel?.split(' ')[0] || report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-xs sm:text-sm mb-3 leading-relaxed">{report.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleExpand(report.id)} 
                        className="px-2 text-xs sm:text-sm h-8 hover:bg-blue-50 text-gray-600"
                      >
                        <span className="flex items-center gap-1">
                          {expandedIds[report.id] ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              <span className="hidden sm:inline">Sembunyikan riwayat</span>
                              <span className="sm:hidden">Tutup</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              <span className="hidden sm:inline">Lihat riwayat</span>
                              <span className="sm:hidden">Detail</span>
                            </>
                          )}
                        </span>
                      </Button>
                    </div>
                    
                    {expandedIds[report.id] && (
                      <div className="mt-3 border-t pt-3">
                        {Array.isArray(report.notes) && report.notes.length > 0 ? (
                          <>
                            <p className="text-xs font-medium text-gray-600 mb-2">Riwayat Pembaruan:</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {report.notes.map((note, idx) => (
                                <div key={`${report.id}-note-${idx}`} className="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg">
                                  <div className="font-medium text-gray-700 mb-1">
                                    {new Date(note.timestamp).toLocaleString('id-ID', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  <div className="leading-relaxed">{note.content}</div>
                                  {getNoteStatusLabel(note.status) && (
                                    <div className="mt-1">
                                      <span className="inline-block px-2 py-0.5 rounded-full bg-white text-gray-700 text-xs">
                                        {getNoteStatusLabel(note.status)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500 italic">Belum ada riwayat pembaruan.</p>
                        )}
                        {report.resolvedAt && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-green-600 font-medium">
                              ✓ Selesai: {new Date(report.resolvedAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No reports submitted yet</p>
                <p className="text-xs sm:text-sm mt-1">Submit your first issue report above</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
      <Alert className="mt-6 border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          If you experience any issues, please contact the Developer via WhatsApp:
          <a 
            href={`https://wa.me/6281234567890`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center text-sm text-green-600 hover:text-green-700 hover:underline transition-colors"
          >
          <svg 
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 align-text-bottom"
            viewBox="0 0 16 16"
            fill="currentColor"
          > 
            <path 
              d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
            <span className="ml-1 font-semibold">+62 812 3456 7890</span>
          </a>
        </AlertDescription>
      </Alert>
      </div>
    </div>
  );
}
