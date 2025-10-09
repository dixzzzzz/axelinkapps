import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building,
  Zap,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  Wrench,
  Eye,
  Calendar,
  Hash,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface CustomerInfo {
  id: string;
  pppoeUsername: string;
  manufacturer: string;
  modelName: string;
}

interface ODPLocation {
  id: string;
  name: string;
  type: 'ODP';
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  capacity: number;
  used: number;
  activePorts?: number;
  inactivePorts?: number;
  status: 'active' | 'full' | 'maintenance';
  installation_date: string;
  notes: string;
  selected_customers?: string[];
  selected_customer_info?: CustomerInfo[];
}

interface ODCLocation {
  id: string;
  name: string;
  type: 'ODC';
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  capacity: number;
  used: number;
  activePorts?: number;
  inactivePorts?: number;
  status: 'active' | 'expansion' | 'maintenance';
  installation_date: string;
  notes: string;
  served_odps: string[];
}

interface InfraStats {
  odp: {
    total: number;
    active: number;
    full: number;
    maintenance: number;
  };
  odc: {
    total: number;
    active: number;
    expansion: number;
    maintenance: number;
  };
}

export default function InfrastructureManagement() {
  const navigate = useNavigate();
  
  // State
  const [odpLocations, setOdpLocations] = useState<ODPLocation[]>([]);
  const [odcLocations, setOdcLocations] = useState<ODCLocation[]>([]);
  
  // Devices list for ODP customer linking
  const [devices, setDevices] = useState<Array<{
    id: string;
    manufacturer: string;
    modelName: string;
    pppoeUsername: string;
    customerPhone: string;
  }>>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [infraStats, setInfraStats] = useState<InfraStats>({
    odp: { total: 0, active: 0, full: 0, maintenance: 0 },
    odc: { total: 0, active: 0, expansion: 0, maintenance: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'full' | 'expansion'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ODP' | 'ODC'>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInfra, setSelectedInfra] = useState<ODPLocation | ODCLocation | null>(null);
  const [infraType, setInfraType] = useState<'ODP' | 'ODC'>('ODP');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [infraForm, setInfraForm] = useState({
    name: '',
    address: '',
    capacity: '',
    notes: '',
    coordinates: '', // Combined lat,lng input
    status: 'active' as 'active' | 'full' | 'maintenance' | 'expansion',
    selectedCustomers: [] as string[], // device IDs linked to ODP
    selectedODPs: [] as string[], // ODP IDs linked to ODC
  });
  
  // Parsed coordinates
  const [parsedCoords, setParsedCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Parse coordinate input from various formats
  const parseCoordinateInput = (input: string): {lat: number, lng: number} | null => {
    if (!input.trim()) return null;

    try {
      // Remove extra spaces and normalize
      const normalized = input.trim().replace(/\s+/g, ' ');

      // Format 1: "lat, lng" or "lat,lng" (most common from Google Maps)
      const commaMatch = normalized.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
      if (commaMatch) {
        const lat = parseFloat(commaMatch[1]);
        const lng = parseFloat(commaMatch[2]);
        if (isValidCoordinate(lat, lng)) {
          return { lat, lng };
        }
      }

      // Format 2: "lat lng" (space separated)
      const spaceMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/);
      if (spaceMatch) {
        const lat = parseFloat(spaceMatch[1]);
        const lng = parseFloat(spaceMatch[2]);
        if (isValidCoordinate(lat, lng)) {
          return { lat, lng };
        }
      }

      // Format 3: Google Maps URL format (various patterns)
      const urlPatterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,  // @lat,lng
        /q=(-?\d+\.\d+),(-?\d+\.\d+)/, // q=lat,lng
        /ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng
        /center=(-?\d+\.\d+),(-?\d+\.\d+)/ // center=lat,lng
      ];
      
      for (const pattern of urlPatterns) {
        const urlMatch = normalized.match(pattern);
        if (urlMatch) {
          const lat = parseFloat(urlMatch[1]);
          const lng = parseFloat(urlMatch[2]);
          if (isValidCoordinate(lat, lng)) {
            return { lat, lng };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return null;
    }
  };
  
  // Validate coordinate ranges
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Load infrastructure data
  const loadInfrastructureData = async () => {
    try {
      setLoading(true);
      
      // Load ODP locations
      const odpResponse = await fetch('/api/admin/infrastructure/odp', {
        credentials: 'include'
      });
      const odpData = await odpResponse.json();
      
      // Load ODC locations
      const odcResponse = await fetch('/api/admin/infrastructure/odc', {
        credentials: 'include'
      });
      const odcData = await odcResponse.json();
      
      if (odpData.success && odcData.success) {
        setOdpLocations(odpData.locations || []);
        setOdcLocations(odcData.locations || []);
        
        // Calculate stats
        const stats = calculateInfraStats(odpData.locations || [], odcData.locations || []);
        setInfraStats(stats);
      } else {
        throw new Error('Failed to load infrastructure data');
      }
    } catch (error) {
      console.error('Error loading infrastructure data:', error);
      toast.error('Failed to load infrastructure data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate infrastructure statistics
  const calculateInfraStats = (odp: ODPLocation[], odc: ODCLocation[]): InfraStats => {
    return {
      odp: {
        total: odp.length,
        active: odp.filter(o => o.status === 'active').length,
        full: odp.filter(o => o.status === 'full').length,
        maintenance: odp.filter(o => o.status === 'maintenance').length,
      },
      odc: {
        total: odc.length,
        active: odc.filter(o => o.status === 'active').length,
        expansion: odc.filter(o => o.status === 'expansion').length,
        maintenance: odc.filter(o => o.status === 'maintenance').length,
      },
    };
  };

  // Load data on component mount
  useEffect(() => {
    loadInfrastructureData();
  }, []);

  // Load devices for customer linking (for ODP)
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devicesResponse = await fetch('/api/admin/genieacs/devices', { credentials: 'include' });
        const devicesData = await devicesResponse.json();
        if (devicesData.success) {
          const mapped = (devicesData.devices || []).map((d: any) => ({
            id: d.id || d._id || d.DeviceID?.SerialNumber || '',
            manufacturer: d.info?.manufacturer || d.DeviceID?.Manufacturer || 'Unknown',
            modelName: d.model || d.DeviceID?.ProductClass || 'Unknown',
            pppoeUsername: d.pppoeUsername || d.VirtualParameters?.pppUsername || '-',
            customerPhone: (Array.isArray(d.Tags) ? (d.Tags.find((t: string) => /\d{10,}/.test(t)) || '-') : (typeof d.tag === 'string' ? d.tag : '-'))
          }));
          setDevices(mapped);
        }
      } catch (e) {
        console.error('Failed to load devices:', e);
      }
    };
    loadDevices();
  }, []);

  // Filter infrastructure
  const allInfrastructure = [...odpLocations, ...odcLocations];
  const filteredInfrastructure = allInfrastructure.filter(infra => {
    const matchesSearch = searchTerm === '' || 
      infra.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      infra.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      infra.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || infra.status === statusFilter;
    const matchesType = typeFilter === 'all' || infra.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle coordinate input change
  const handleCoordinateChange = (value: string) => {
    setInfraForm({ ...infraForm, coordinates: value });
    const parsed = parseCoordinateInput(value);
    setParsedCoords(parsed);
  };
  
  // Modal handlers
  const openAddModal = (type: 'ODP' | 'ODC') => {
    setInfraType(type);
    setInfraForm({
      name: '',
      address: '',
      capacity: type === 'ODP' ? '8' : '144',
      notes: '',
      coordinates: '',
      status: 'active',
      selectedCustomers: [],
      selectedODPs: [],
    });
    setParsedCoords(null);
    setCustomerSearch(''); // Reset search
    setIsAddModalOpen(true);
  };

  const openEditModal = (infra: ODPLocation | ODCLocation) => {
    setSelectedInfra(infra);
    setInfraType(infra.type);
    const coordString = `${infra.location.lat}, ${infra.location.lng}`;
    
    const selectedCustomers = infra.type === 'ODP' ? ((infra as ODPLocation).selected_customers || []) : [];
    console.log('🗜️ Opening edit modal for ODP:', {
      infraId: infra.id,
      infraType: infra.type,
      activePorts: (infra as ODPLocation).activePorts,
      selectedCustomers: selectedCustomers,
      selectedCustomersLength: selectedCustomers.length,
      selectedCustomerInfo: (infra as ODPLocation).selected_customer_info,
      fullInfraData: infra
    });
    
    setInfraForm({
      name: infra.name,
      address: infra.address,
      capacity: infra.capacity.toString(),
      notes: infra.notes,
      coordinates: coordString,
      status: infra.status,
      selectedCustomers: selectedCustomers,
      selectedODPs: infra.type === 'ODC' ? (infra.served_odps || []) : [],
    });
    setParsedCoords({
      lat: infra.location.lat,
      lng: infra.location.lng
    });
    
    console.log('📋 InfraForm after setInfraForm:', {
      selectedCustomers: selectedCustomers,
      selectedCustomersLength: selectedCustomers.length
    });
    
    setIsEditModalOpen(true);
  };

  const openViewModal = (infra: ODPLocation | ODCLocation) => {
    setSelectedInfra(infra);
    setIsViewModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedInfra(null);
    setIsSaving(false);
    setParsedCoords(null);
    setCustomerSearch(''); // Reset search
  };

  // Save infrastructure
  const saveInfrastructure = async (isEdit: boolean = false) => {
    try {
      setIsSaving(true);
      
      if (!infraForm.name || !parsedCoords) {
        toast.error('Please fill in valid name and coordinates');
        return;
      }
      
      // Generate ID automatically from name if not editing
      let infraId = '';
      if (isEdit && selectedInfra) {
        infraId = selectedInfra.id;
      } else {
        // Generate ID from name: remove special chars, replace spaces with hyphens, add prefix
        const cleanName = infraForm.name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
        infraId = `${infraType.toLowerCase()}-${cleanName}-${Date.now().toString().slice(-6)}`;
      }

      const endpoint = infraType === 'ODP' 
        ? `/api/admin/infrastructure/odp${isEdit ? `/${infraId}` : ''}`
        : `/api/admin/infrastructure/odc${isEdit ? `/${infraId}` : ''}`;
      
      const method = isEdit ? 'PATCH' : 'POST';
      
      const body: any = {
        id: infraId,
        name: infraForm.name,
        lat: parsedCoords.lat,
        lng: parsedCoords.lng,
        address: infraForm.address,
        capacity: parseInt(infraForm.capacity) || (infraType === 'ODP' ? 8 : 144),
        status: infraForm.status,
        notes: infraForm.notes
      };

      // Mapping perubahan sesuai permintaan:
      if (infraType === 'ODP') {
        // Send selected customers list and port count
        body.selectedCustomers = infraForm.selectedCustomers || [];
        body.activePorts = (infraForm.selectedCustomers || []).length;
        // Also send selected customers info for readability and backend storage
        const info = (infraForm.selectedCustomers || []).map(id => {
          const dev = devices.find(d => d.id === id);
          return dev ? {
            id: dev.id,
            pppoeUsername: dev.pppoeUsername,
            manufacturer: dev.manufacturer,
            modelName: dev.modelName,
          } : { id } as any;
        });
        body.selectedCustomersInfo = info;
        console.log('👥 Selected customers being sent:', {
          selectedCustomers: body.selectedCustomers,
          selectedCustomersInfo: body.selectedCustomersInfo
        });
      } else if (infraType === 'ODC') {
        // Gantikan pengisian port aktif dengan daftar ODP yang dilayani
        body.served_odps = infraForm.selectedODPs || [];
      }

      console.log(`🚀 Sending ${method} request to ${endpoint}:`, body);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ ${infraType} ${isEdit ? 'updated' : 'added'} successfully:`, data.data);
        toast.success(`${infraType} success ${isEdit ? 'updated' : 'added'}`);
        
        // Refresh infrastructure data
        await loadInfrastructureData();
        
        // If this is ODP update with customers, log the changes
        if (infraType === 'ODP' && infraForm.selectedCustomers.length > 0) {
          console.log(`🎯 ODP updated with ${infraForm.selectedCustomers.length} customers - activePorts should be: ${infraForm.selectedCustomers.length}`);
        }
        
        closeModals();
      } else {
        throw new Error(data.message || `Fail ${isEdit ? 'updated' : 'added'} ${infraType}`);
      }
    } catch (error) {
      console.error('Error saving infrastructure:', error);
      toast.error(`Fail ${isEdit ? 'updated' : 'added'} ${infraType}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete infrastructure
  const deleteInfrastructure = async (infra: ODPLocation | ODCLocation) => {
    if (!confirm(`Are you sure you want to delete? ${infra.type} "${infra.name}"?`)) {
      return;
    }

    try {
      const endpoint = infra.type === 'ODP' 
        ? `/api/admin/infrastructure/odp/${infra.id}`
        : `/api/admin/infrastructure/odc/${infra.id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${infra.type} successfully deleted`);
        await loadInfrastructureData();
      } else {
        throw new Error(data.message || `Failed to delete ${infra.type}`);
      }
    } catch (error) {
      console.error('Error deleting infrastructure:', error);
      toast.error(`Failed to delete ${infra.type}`);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string, type: string) => {
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    } else if (status === 'full') {
      return <Badge variant="destructive">Full</Badge>;
    } else if (status === 'maintenance') {
      return <Badge variant="secondary" className="bg-orange-500 text-white">Maintenance</Badge>;
    } else if (status === 'expansion') {
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Expansion</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building className="h-8 w-8 text-blue-600" />
            Infrastructure management
          </h1>
          <p className="text-gray-600 mt-1">Manage ODP and ODC in Optical Fiber Networks</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => openAddModal('ODP')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add ODP
          </Button>
          <Button 
            onClick={() => openAddModal('ODC')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add ODC
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">Total ODP</p>
                <p className="text-xl md:text-3xl font-bold">{infraStats.odp.total}</p>
                <p className="text-xs text-purple-200 mt-1">
                  {infraStats.odp.active} Active • {infraStats.odp.full} Full
                </p>
              </div>
              <Building className="h-6 w-6 md:h-8 md:w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs md:text-sm">Total ODC</p>
                <p className="text-xl md:text-3xl font-bold">{infraStats.odc.total}</p>
                <p className="text-xs text-indigo-200 mt-1">
                  {infraStats.odc.active} Active • {infraStats.odc.expansion} Expansion
                </p>
              </div>
              <Zap className="h-6 w-6 md:h-8 md:w-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">Port Active</p>
                <p className="text-xl md:text-3xl font-bold">
                  {odpLocations.reduce((sum, odp) => sum + (odp.activePorts || 0), 0) +
                   odcLocations.reduce((sum, odc) => sum + (odc.activePorts || 0), 0)}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs md:text-sm">Maintenance</p>
                <p className="text-xl md:text-3xl font-bold">
                  {infraStats.odp.maintenance + infraStats.odc.maintenance}
                </p>
              </div>
              <Wrench className="h-6 w-6 md:h-8 md:w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ID, name, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Type</SelectItem>
                  <SelectItem value="ODP">ODP</SelectItem>
                  <SelectItem value="ODC">ODC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="expansion">Expansion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Button 
                onClick={loadInfrastructureData} 
                variant="outline" 
                className="w-full"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Infrastructure List ({filteredInfrastructure.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInfrastructure.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No infrastructure found</p>
              <p className="text-gray-400 text-sm">Try to change the filter or add new infrastructure</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInfrastructure.map((infra) => (
                <div
                  key={infra.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Infrastructure Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {infra.type === 'ODP' ? (
                          <Building className="h-5 w-5 text-purple-600" />
                        ) : (
                          <Zap className="h-5 w-5 text-indigo-600" />
                        )}
                        <h3 className="text-lg font-semibold">{infra.name}</h3>
                        <Badge variant="outline" className={
                          infra.type === 'ODP' ? 'border-purple-200 text-purple-700' : 'border-indigo-200 text-indigo-700'
                        }>
                          {infra.type}
                        </Badge>
                        {getStatusBadge(infra.status, infra.type)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Location:</span>
                          <span className="text-gray-600 truncate">{infra.address || 'There is no address'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Capacity:</span>
                          <span className="text-gray-600">
                            {infra.type === 'ODC' ? (infra.used || 0) : (infra.activePorts || 0)}/{infra.capacity} port
                          </span>
                        </div>
                      </div>

                      {/* Port/Connection Status */}
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        {infra.type === 'ODP' ? (
                          <>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>Customer: {infra.activePorts || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              <span>Available: {infra.capacity - (infra.activePorts || 0)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                              <span>ODP Connected: {(infra as ODCLocation).served_odps?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              <span>Available: {infra.capacity - (infra.used || 0)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewModal(infra)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(infra)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteInfrastructure(infra)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {infraType === 'ODP' ? (
                <Building className="h-5 w-5 text-purple-600" />
              ) : (
                <Zap className="h-5 w-5 text-indigo-600" />
              )}
              {isEditModalOpen ? 'Edit' : 'Add'} {infraType}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name {infraType} *</Label>
              <Input
                id="name"
                value={infraForm.name}
                onChange={(e) => setInfraForm({ ...infraForm, name: e.target.value })}
                placeholder={`Contoh: ${infraType} Jl. Merdeka 01`}
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={infraForm.address}
                onChange={(e) => setInfraForm({ ...infraForm, address: e.target.value })}
                placeholder="Complete address"
              />
            </div>

            <div>
              <Label htmlFor="coordinates">Coordinate (Latitude, Longitude) *</Label>
              <Input
                id="coordinates"
                value={infraForm.coordinates}
                onChange={(e) => handleCoordinateChange(e.target.value)}
                placeholder="Contoh: -7.201411094721833, 107.94800240891712"
                className={`mt-1 ${
                  infraForm.coordinates && !parsedCoords 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : infraForm.coordinates && parsedCoords
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                    : ''
                }`}
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  Supported format:
                </p>
                <ul className="text-xs text-gray-500 space-y-0.5 ml-2">
                  <li>• -7.199102, 107.94646 (from Google Maps)</li>
                  <li>• -7.199102 107.94646 (space)</li>
                  <li>• URL Google Maps (auto extract)</li>
                </ul>
                {infraForm.coordinates && parsedCoords && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Valid coordinate: {parsedCoords.lat.toFixed(6)}, {parsedCoords.lng.toFixed(6)}
                  </p>
                )}
                {infraForm.coordinates && !parsedCoords && (
                  <p className="text-xs text-red-600">
                    ✗ Invalid coordinate format
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="capacity">Port capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={infraForm.capacity}
                  onChange={(e) => setInfraForm({ ...infraForm, capacity: e.target.value })}
                  placeholder={infraType === 'ODP' ? '8' : '144'}
                />
              </div>
            </div>

            {/* Update sections sesuai tipe */}
            {infraType === 'ODP' ? (
              <div className="mt-2 p-4 border rounded-lg">
                <div className="font-medium mb-2">Update: Add the customer (Map Monitoring)</div>
                <div className="text-xs text-gray-500 mb-2">Select Customer to calculate the active port</div>
                {/* Search input */}
                <div className="mb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search PPPoE, brand, model, or phone number"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                {/* Simple selector with checkboxes */}
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {devices.length === 0 ? (
                    <div className="text-xs text-gray-500">No customer data</div>
                  ) : (
                    (() => {
                      const q = customerSearch.trim().toLowerCase();
                      const filtered = q
                        ? devices.filter((d) =>
                            (d.pppoeUsername || '').toLowerCase().includes(q) ||
                            (d.manufacturer || '').toLowerCase().includes(q) ||
                            (d.modelName || '').toLowerCase().includes(q) ||
                            (d.customerPhone || '').includes(q)
                          )
                        : devices;
                      if (filtered.length === 0) {
                        return <div className="text-xs text-gray-500">No results for "{customerSearch}"</div>;
                      }
                      // Separate available and unavailable customers
                      const availableCustomers: typeof filtered = [];
                      const unavailableCustomers: Array<typeof filtered[0] & {connectedToODP: string}> = [];
                      
                      filtered.forEach(d => {
                        // Check if customer is already connected to another ODP
                        const connectedODP = odpLocations.find(odp => 
                          odp.selected_customers && odp.selected_customers.includes(d.id) && 
                          (!isEditModalOpen || odp.id !== selectedInfra?.id)
                        );
                        
                        if (connectedODP) {
                          unavailableCustomers.push({ ...d, connectedToODP: connectedODP.name });
                        } else {
                          availableCustomers.push(d);
                        }
                      });
                      
                      return (
                        <div className="space-y-2">
                          {/* Available customers first */}
                          {availableCustomers.map((d) => {
                            const checked = infraForm.selectedCustomers.includes(d.id);
                            return (
                              <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const set = new Set(infraForm.selectedCustomers);
                                    if (e.target.checked) set.add(d.id); else set.delete(d.id);
                                    setInfraForm({ ...infraForm, selectedCustomers: Array.from(set) });
                                  }}
                                  className="text-purple-600"
                                />
                                <span className="font-mono text-xs text-gray-800 font-medium">{d.pppoeUsername}</span>
                                <span className="text-gray-600 text-xs">({d.manufacturer} {d.modelName})</span>
                              </label>
                            );
                          })}
                          
                          {/* Separator if both available and unavailable exist */}
                          {availableCustomers.length > 0 && unavailableCustomers.length > 0 && (
                            <div className="border-t border-gray-200 my-2 pt-2">
                              <div className="text-xs text-gray-500 font-medium mb-1">🚫 Already connected to another ODP:</div>
                            </div>
                          )}
                          
                          {/* Unavailable customers at bottom */}
                          {unavailableCustomers.map((d) => {
                            return (
                              <label key={d.id} className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed p-1 rounded bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  disabled={true}
                                  className="text-gray-400 cursor-not-allowed"
                                />
                                <span className="font-mono text-xs text-gray-500 line-through">{d.pppoeUsername}</span>
                                <span className="text-gray-400 text-xs line-through">({d.manufacturer} {d.modelName})</span>
                                <span className="text-xs text-red-500 bg-red-50 px-1 py-0.5 rounded text-[10px]">
                                  @ {d.connectedToODP}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Dipilih: {infraForm.selectedCustomers.length} customer → Port Active = {infraForm.selectedCustomers.length}
                </div>
              </div>
            ) : (
              <div className="mt-2 p-4 border rounded-lg">
                <div className="font-medium mb-2">Update: Add the served ODP</div>
                <div className="text-xs text-gray-500 mb-2">Select ODP that is connected to this ODC</div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {odpLocations.length === 0 ? (
                    <div className="text-xs text-gray-500">No ODP data</div>
                  ) : odpLocations.map((o) => {
                    const checked = infraForm.selectedODPs.includes(o.id);
                    return (
                      <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const set = new Set(infraForm.selectedODPs);
                            if (e.target.checked) set.add(o.id); else set.delete(o.id);
                            setInfraForm({ ...infraForm, selectedODPs: Array.from(set) });
                          }}
                        />
                        <span className="font-semibold text-gray-700">{o.name}</span>
                        <span className="text-xs text-gray-500">({o.used}/{o.capacity})</span>
                      </label>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  Dipilih: {infraForm.selectedODPs.length} ODP
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={infraForm.status} onValueChange={(value: any) => setInfraForm({ ...infraForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  {infraType === 'ODC' && (
                    <SelectItem value="expansion">Expansion</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={infraForm.notes}
                onChange={(e) => setInfraForm({ ...infraForm, notes: e.target.value })}
                placeholder="Additional notes or descriptions"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModals} disabled={isSaving}>
              Batal
            </Button>
            <Button 
              onClick={() => saveInfrastructure(isEditModalOpen)}
              disabled={isSaving || !infraForm.name || !parsedCoords}
              className={infraType === 'ODP' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                `${isEditModalOpen ? 'Update' : 'Save'} ${infraType}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedInfra?.type === 'ODP' ? (
                <Building className="h-5 w-5 text-purple-600" />
              ) : (
                <Zap className="h-5 w-5 text-indigo-600" />
              )}
              Detail {selectedInfra?.type} - {selectedInfra?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedInfra && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedInfra.status, selectedInfra.type)}</div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Address</Label>
                <p className="text-sm">{selectedInfra.address || 'Tidak ada alamat'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Coordinate</Label>
                  <p className="text-sm font-mono">
                    {selectedInfra.location.lat.toFixed(6)}, {selectedInfra.location.lng.toFixed(6)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Installation date</Label>
                  <p className="text-sm">
                    {selectedInfra.installation_date ? formatDate(selectedInfra.installation_date) : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Port/Connection Information */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  {selectedInfra.type === 'ODP' ? 'Customer Information' : 'Connection Information'}
                </Label>
                {selectedInfra.type === 'ODP' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-lg font-bold text-blue-600">{selectedInfra.capacity}</div>
                      <div className="text-blue-600">Total Port</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-lg font-bold text-green-600">{selectedInfra.activePorts || 0}</div>
                      <div className="text-green-600">Customer</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <div className="text-lg font-bold text-gray-600">
                        {selectedInfra.capacity - (selectedInfra.activePorts || 0)}
                      </div>
                      <div className="text-gray-600">Available</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-indigo-50 rounded-lg text-center">
                      <div className="text-lg font-bold text-indigo-600">
                        {(selectedInfra as ODCLocation).served_odps?.length || 0}
                      </div>
                      <div className="text-indigo-600">ODP Connected</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-lg font-bold text-blue-600">{selectedInfra.capacity}</div>
                      <div className="text-blue-600">Total Port</div>
                    </div>
                  </div>
                )}
              </div>

              {selectedInfra.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedInfra.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeModals}>
              Close
            </Button>
            {selectedInfra && (
              <Button onClick={() => {
                closeModals();
                setTimeout(() => openEditModal(selectedInfra), 100);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
