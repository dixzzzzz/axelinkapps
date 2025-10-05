import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Ticket, 
  Plus, 
  Printer, 
  Download, 
  Trash2, 
  Eye, 
  RefreshCw,
  Settings,
  Users,
  Wifi,
  QrCode,
  Copy,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Hash,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface VoucherProfile {
  id: string;
  name: string;
  rateLimit?: string;
  sessionTimeout?: string;
  description?: string;
}

interface HotspotServer {
  id: string;
  name: string;
  interface: string;
  disabled: boolean;
}

interface Voucher {
  id: string;
  username: string;
  password: string;
  profile: string;
  server: string;
  price: number;
  createdAt: string;
  isActive: boolean;
  usedAt?: string;
  expiresAt?: string;
  comment?: string;
}

interface VoucherGenerateRequest {
  count: number;
  prefix: string;
  profile: string;
  server: string;
  price: number;
  charType: 'alphanumeric' | 'numeric' | 'alphabetic';
  voucherModel: 'default' | 'model1' | 'model2';
  validUntil?: string;
}

export default function VoucherManagement() {
  // State
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [profiles, setProfiles] = useState<VoucherProfile[]>([]);
  const [servers, setServers] = useState<HotspotServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfile, setFilterProfile] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Generate form
  const [generateForm, setGenerateForm] = useState<VoucherGenerateRequest>({
    count: 10,
    prefix: 'wifi-',
    profile: '',
    server: 'all',
    price: 5000,
    charType: 'alphanumeric',
    voucherModel: 'default',
    validUntil: ''
  });
  
  // Selected vouchers for batch operations
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  // Load initial data
  useEffect(() => {
    loadVoucherData();
  }, []);

  const loadVoucherData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVouchers(),
        loadProfiles(),
        loadServers()
      ]);
    } catch (error) {
      console.error('Error loading voucher data:', error);
      toast.error('Failed to load voucher data');
    } finally {
      setLoading(false);
    }
  };

  const loadVouchers = async () => {
    try {
      const response = await fetch('/api/admin/vouchers');
      const data = await response.json();
      
      if (data.success) {
        setVouchers(data.vouchers || []);
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await fetch('/api/admin/hotspot/profiles');
      const data = await response.json();
      
      if (data.success) {
        setProfiles(data.profiles || []);
        // Set default profile if not set
        if (data.profiles.length > 0 && !generateForm.profile) {
          setGenerateForm(prev => ({ ...prev, profile: data.profiles[0].name }));
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch('/api/admin/hotspot/servers');
      const data = await response.json();
      
      if (data.success) {
        setServers(data.servers || []);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

  // Generate vouchers
  const handleGenerateVouchers = async () => {
    if (!generateForm.profile) {
      toast.error('Please select a profile');
      return;
    }

    if (generateForm.count < 1 || generateForm.count > 100) {
      toast.error('Voucher count must be between 1 and 100');
      return;
    }

    try {
      setGenerating(true);
      
      const response = await fetch('/api/admin/vouchers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateForm),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully generated ${data.vouchers.length} vouchers`);
        setShowGenerateDialog(false);
        loadVouchers(); // Reload voucher list
        
        // Show print dialog with generated vouchers
        setSelectedVouchers(data.vouchers.map((v: Voucher) => v.id));
        setShowPrintDialog(true);
      } else {
        toast.error(data.message || 'Failed to generate vouchers');
      }
    } catch (error) {
      console.error('Error generating vouchers:', error);
      toast.error('Failed to generate vouchers');
    } finally {
      setGenerating(false);
    }
  };

  // Delete voucher
  const handleDeleteVoucher = async (voucherId: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Voucher deleted successfully');
        loadVouchers();
      } else {
        toast.error(data.message || 'Failed to delete voucher');
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      toast.error('Failed to delete voucher');
    }
  };

  // Print vouchers
  const handlePrintVouchers = () => {
    if (selectedVouchers.length === 0) {
      toast.error('Please select vouchers to print');
      return;
    }

    const vouchersToPrint = vouchers.filter(v => selectedVouchers.includes(v.id));
    
    // Open print window
    const printWindow = window.open('/admin/vouchers/print', '_blank');
    
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.postMessage({
          type: 'PRINT_VOUCHERS',
          data: {
            vouchers: vouchersToPrint,
            model: generateForm.voucherModel,
            namaHotspot: 'ISP Voucher System',
            adminKontak: 'Contact Admin'
          }
        }, '*');
      });
    }
  };

  // Copy voucher credentials
  const handleCopyCredentials = (voucher: Voucher) => {
    const text = `Username: ${voucher.username}\nPassword: ${voucher.password}\nProfile: ${voucher.profile}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Credentials copied to clipboard');
    });
  };

  // Filter vouchers
  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.profile.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfile = filterProfile === 'all' || voucher.profile === filterProfile;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && voucher.isActive) ||
                         (filterStatus === 'inactive' && !voucher.isActive);
    
    return matchesSearch && matchesProfile && matchesStatus;
  });

  // Statistics
  const stats = {
    total: vouchers.length,
    active: vouchers.filter(v => v.isActive).length,
    inactive: vouchers.filter(v => !v.isActive).length,
    totalValue: vouchers.reduce((sum, v) => sum + v.price, 0)
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6 text-blue-600" />
            Voucher Management System
          </h1>
          <p className="text-muted-foreground">Generate, manage, and print hotspot vouchers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadVoucherData} disabled={loading} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate New Vouchers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="count">Quantity</Label>
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      max="100"
                      value={generateForm.count}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (IDR)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={generateForm.price}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="profile">Profile</Label>
                  <Select value={generateForm.profile} onValueChange={(value) => setGenerateForm(prev => ({ ...prev, profile: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.name}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="charType">Character Type</Label>
                    <Select value={generateForm.charType} onValueChange={(value: any) => setGenerateForm(prev => ({ ...prev, charType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alphanumeric">Alphanumeric</SelectItem>
                        <SelectItem value="numeric">Numeric Only</SelectItem>
                        <SelectItem value="alphabetic">Alphabetic Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="voucherModel">Voucher Model</Label>
                    <Select value={generateForm.voucherModel} onValueChange={(value: any) => setGenerateForm(prev => ({ ...prev, voucherModel: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="model1">Model 1 (Simple)</SelectItem>
                        <SelectItem value="model2">Model 2 (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="prefix">Username Prefix</Label>
                  <Input
                    id="prefix"
                    value={generateForm.prefix}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, prefix: e.target.value }))}
                    placeholder="wifi-"
                  />
                </div>

                <Button 
                  onClick={handleGenerateVouchers} 
                  disabled={generating} 
                  className="w-full gap-2"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Generate {generateForm.count} Vouchers
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Vouchers</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.total}</p>
              </div>
              <Ticket className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Active Vouchers</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Unused Vouchers</p>
                <p className="text-lg lg:text-2xl font-bold text-orange-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-lg lg:text-2xl font-bold text-purple-600">
                  Rp {stats.totalValue.toLocaleString('id-ID')}
                </p>
              </div>
              <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search vouchers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterProfile} onValueChange={setFilterProfile}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Profiles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.name}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Unused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {selectedVouchers.length > 0 && (
                <>
                  <Badge variant="secondary" className="gap-1">
                    <Hash className="h-3 w-3" />
                    {selectedVouchers.length} selected
                  </Badge>
                  <Button 
                    onClick={handlePrintVouchers} 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Selected
                  </Button>
                  <Button 
                    onClick={() => setSelectedVouchers([])} 
                    variant="outline" 
                    size="sm"
                  >
                    Clear Selection
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Voucher List ({filteredVouchers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading vouchers...
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No vouchers found</p>
              <p className="text-sm text-gray-400">Generate new vouchers to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 p-2 border-b">
                <input
                  type="checkbox"
                  checked={selectedVouchers.length === filteredVouchers.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVouchers(filteredVouchers.map(v => v.id));
                    } else {
                      setSelectedVouchers([]);
                    }
                  }}
                  className="rounded"
                />
                <Label className="text-sm font-medium">
                  Select All ({filteredVouchers.length})
                </Label>
              </div>

              {/* Voucher Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVouchers.map((voucher) => (
                  <Card key={voucher.id} className={`relative ${selectedVouchers.includes(voucher.id) ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="checkbox"
                          checked={selectedVouchers.includes(voucher.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVouchers(prev => [...prev, voucher.id]);
                            } else {
                              setSelectedVouchers(prev => prev.filter(id => id !== voucher.id));
                            }
                          }}
                          className="rounded"
                        />
                        <Badge variant={voucher.isActive ? "default" : "secondary"}>
                          {voucher.isActive ? "Active" : "Unused"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-gray-500">Username</Label>
                          <p className="font-mono font-bold text-lg">{voucher.username}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-gray-500">Password</Label>
                          <p className="font-mono text-sm">{voucher.password}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs text-gray-500">Profile</Label>
                            <p className="text-sm">{voucher.profile}</p>
                          </div>
                          <div className="text-right">
                            <Label className="text-xs text-gray-500">Price</Label>
                            <p className="font-bold text-green-600">
                              Rp {voucher.price.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-500">Created</Label>
                          <p className="text-xs">{new Date(voucher.createdAt).toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mt-4">
                        <Button
                          onClick={() => handleCopyCredentials(voucher)}
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                        <Button
                          onClick={() => setSelectedVouchers([voucher.id])}
                          size="sm"
                          variant="outline"
                          className="gap-1"
                        >
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteVoucher(voucher.id)}
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}