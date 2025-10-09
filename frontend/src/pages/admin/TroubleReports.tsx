import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Activity,
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Filter, 
  MessageSquare, 
  Phone, 
  Search, 
  Settings, 
  User, 
  Wifi,
  Router,
  Globe,
  Calendar,
  Download,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface TroubleReport {
  id: string;
  phone: string;
  name: string;
  location: string;
  category: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  notes?: Array<{
    timestamp: string;
    content: string;
    status: string;
    notificationSent?: boolean;
  }>;
}

interface TroubleReportStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export default function TroubleReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<TroubleReport[]>([]);
  const [stats, setStats] = useState<TroubleReportStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedReport, setSelectedReport] = useState<TroubleReport | null>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [statusUpdateModal, setStatusUpdateModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('open');
  const [updating, setUpdating] = useState(false);
  
  // Fetch trouble reports from API
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/admin/trouble/reports', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch reports');
      }
      
      setReports(data.reports || []);
      setStats({
        total: data.stats?.total || 0,
        open: data.stats?.open || 0,
        inProgress: data.stats?.inProgress || 0,
        resolved: data.stats?.resolved || 0,
        closed: data.stats?.closed || 0
      });
      
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trouble reports');
      setReports([]);
      setStats({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch single report details
  const fetchReportDetail = async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/trouble/reports/${reportId}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch report details');
      }
      
      return data.report;
    } catch (error) {
      console.error('Error fetching report details:', error);
      toast.error('Failed to load report details');
      throw error;
    }
  };
  
  // Update report status
  const updateReportStatus = async (reportId: string, status: string, notes?: string) => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/admin/trouble/reports/${reportId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: status,
          notes: notes || '',
          sendNotification: true
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update status');
      }
      
      // Refresh reports list
      await fetchReports();
      
      toast.success('Report status successfully updated');
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update report status');
      return false;
    } finally {
      setUpdating(false);
    }
  };
  
  // Add note to report
  const addReportNote = async (reportId: string, note: string) => {
    try {
      setUpdating(true);
      
      const response = await fetch(`/api/admin/trouble/reports/${reportId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ notes: note })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to add note');
      }
      
      // Refresh reports list
      await fetchReports();
      
      toast.success('Note added successfully');
      return true;
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add record');
      return false;
    } finally {
      setUpdating(false);
    }
  };
  
  // Load reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Filter reports based on current filters
  const filteredReports = reports.filter(report => {
    const statusMatch = statusFilter === 'all' || report.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || report.category === categoryFilter;
    const searchMatch = searchQuery === '' || 
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.phone.includes(searchQuery);
    
    return statusMatch && categoryMatch && searchMatch;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(reports.map(r => r.category)));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Belum Ditangani</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800"><Settings className="h-3 w-3" />Sedang Ditangani</Badge>;
      case 'resolved':
        return <Badge variant="default" className="gap-1 bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" />Terselesaikan</Badge>;
      case 'closed':
        return <Badge variant="outline" className="gap-1"><CheckCircle className="h-3 w-3" />Ditutup</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.toLowerCase().includes('internet')) return <Globe className="h-4 w-4" />;
    if (category.toLowerCase().includes('wifi')) return <Wifi className="h-4 w-4" />;
    if (category.toLowerCase().includes('perangkat') || category.toLowerCase().includes('router')) return <Router className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('id-ID'),
      time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleExportReports = () => {
    toast.success('Laporan berhasil diekspor!');
  };
  
  // Modal handlers
  const handleViewDetail = async (report: TroubleReport) => {
    try {
      const detailReport = await fetchReportDetail(report.id);
      setSelectedReport(detailReport);
      setDetailModal(true);
    } catch (error) {
      // Error already handled in fetchReportDetail
    }
  };
  
  const handleStatusUpdate = (report: TroubleReport) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setNewNote('');
    setStatusUpdateModal(true);
  };
  
  const handleAddNote = (report: TroubleReport) => {
    setSelectedReport(report);
    setNewNote('');
    setNoteModal(true);
  };
  
  const handleSubmitStatusUpdate = async () => {
    if (!selectedReport) return;
    
    const success = await updateReportStatus(selectedReport.id, newStatus, newNote);
    if (success) {
      setStatusUpdateModal(false);
      setSelectedReport(null);
      setNewNote('');
    }
  };
  
  const handleSubmitNote = async () => {
    if (!selectedReport || !newNote.trim()) return;
    
    const success = await addReportNote(selectedReport.id, newNote.trim());
    if (success) {
      setNoteModal(false);
      setSelectedReport(null);
      setNewNote('');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-blue-600" />
            Trouble Report Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all outage reports from customers</p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto order-last md:order-none">
          <Button onClick={handleExportReports} className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Report</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Not Handled</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Under Process</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.inProgress}</p>
              </div>
              <Settings className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold">{stats.resolved + stats.closed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Not Handled</SelectItem>
                  <SelectItem value="in_progress">Under Process</SelectItem>
                  <SelectItem value="resolved">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Category Filter
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Category</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search for ID, name, or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              List of Disturbance Reports
            </CardTitle>
            <Badge variant="outline" className="px-3 py-1">
              {filteredReports.length} Report
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {filteredReports.length > 0 ? (
                <div className="space-y-4 p-4 sm:p-6">
                  {filteredReports
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((report) => {
                      const createdDate = formatDate(report.createdAt);
                      const updatedDate = formatDate(report.updatedAt);
                      
                      return (
                        <Card key={report.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Report Info */}
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">#{report.id}</span>
                                    {getStatusBadge(report.status)}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    {createdDate.date} {createdDate.time}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-500" />
                                      <span className="font-medium">{report.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Phone className="h-4 w-4" />
                                      {report.phone}
                                    </div>
                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                      <div className="mt-0.5">📍</div>
                                      <span>{report.location}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      {getCategoryIcon(report.category)}
                                      <Badge variant="outline" className="px-3 py-1">
                                        {report.category}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      <strong>Description:</strong> {report.description}
                                    </div>
                                    {report.notes && report.notes.length > 0 && (
                                      <div className="flex items-center gap-2 text-sm text-blue-600">
                                        <MessageSquare className="h-4 w-4" />
                                        {report.notes.length} notes
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  Last updated: {updatedDate.date} {updatedDate.time}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => handleViewDetail(report)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Detail
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => handleStatusUpdate(report)}
                                >
                                  <Settings className="h-4 w-4" />
                                  Update Status
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                                  onClick={() => handleAddNote(report)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Add Note
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => window.open(`https://wa.me/${report.phone.replace(/^0/, '62')}`, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  WhatsApp
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No reports of outages were found</p>
                  <p className="text-gray-400 text-sm">Try changing the search filter or keywords</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Report Details #{selectedReport?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Customer Name</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{selectedReport.name}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phone number</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      <span>{selectedReport.phone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Category</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getCategoryIcon(selectedReport.category)}
                      <Badge variant="outline">{selectedReport.category}</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Date Created</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedReport.createdAt).date} {formatDate(selectedReport.createdAt).time}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(selectedReport.updatedAt).date} {formatDate(selectedReport.updatedAt).time}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Location</Label>
                <p className="mt-1 text-sm">{selectedReport.location}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Problem Description</Label>
                <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">{selectedReport.description}</p>
              </div>
              
              {/* Notes History */}
              {selectedReport.notes && selectedReport.notes.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">History Notes</Label>
                  <div className="mt-2 space-y-3">
                    {selectedReport.notes.map((note, index) => (
                      <div key={index} className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 rounded-r-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-blue-600">
                            Status: {note.status === 'open' ? 'Not Handled' : 
                                    note.status === 'in_progress' ? 'Under Process' :
                                    note.status === 'resolved' ? 'Completed' : 'Closed'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(note.timestamp).date} {formatDate(note.timestamp).time}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{note.content}</p>
                        {note.notificationSent && (
                          <span className="text-xs text-green-600 mt-1 block">✓ Notification sent</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Status Update Modal */}
      <Dialog open={statusUpdateModal} onOpenChange={setStatusUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Report Status Update
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label>Report #{selectedReport.id}</Label>
                <p className="text-sm text-gray-600 mt-1">{selectedReport.name} - {selectedReport.category}</p>
              </div>
              
              <div>
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Not Hanled</SelectItem>
                    <SelectItem value="in_progress">Under Process</SelectItem>
                    <SelectItem value="resolved">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="note">Notes (Optional)</Label>
                <Textarea 
                  id="note"
                  placeholder="Add a note for this status change..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setStatusUpdateModal(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitStatusUpdate}
              disabled={updating}
            >
              {updating ? 'Processing...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Note Modal */}
      <Dialog open={noteModal} onOpenChange={setNoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Add Note
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label>Report #{selectedReport.id}</Label>
                <p className="text-sm text-gray-600 mt-1">{selectedReport.name} - {selectedReport.category}</p>
              </div>
              
              <div>
                <Label htmlFor="note">Notes</Label>
                <Textarea 
                  id="note"
                  placeholder="Add a note to this report..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNoteModal(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitNote}
              disabled={updating || !newNote.trim()}
            >
              {updating ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}