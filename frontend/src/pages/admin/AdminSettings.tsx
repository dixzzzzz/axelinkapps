import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  MessageSquare, 
  Image, 
  Server, 
  Database, 
  Activity, 
  Wifi, 
  QrCode, 
  Users, 
  Upload, 
  Download, 
  Save, 
  RefreshCw, 
  Trash2, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { csrfManager } from '@/utils/csrf';

interface SystemSettings {
  admin_username: string;
  admin_password: string;
  genieacs_url: string;
  genieacs_username: string;
  genieacs_password: string;
  mikrotik_host: string;
  mikrotik_port: string;
  mikrotik_user: string;
  mikrotik_password: string;
  company_header: string;
  footer_info: string;
  customerPortalOtp: boolean;
  otp_length: string;
  pppoe_monitor_enable: boolean;
  rx_power_warning: string;
  rx_power_critical: string;
  whatsapp_keep_alive: boolean;
}

interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string;
  connectedSince?: string;
  qr?: string;
}

interface WhatsAppGroup {
  id: string;
  name: string;
  participants: number;
  created: string;
  isAdmin: boolean;
}

interface BackupFile {
  filename: string;
  size: number;
  created: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  user_type: 'admin' | 'customer';
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SystemSettings>({
    admin_username: '',
    admin_password: '',
    genieacs_url: '',
    genieacs_username: '',
    genieacs_password: '',
    mikrotik_host: '',
    mikrotik_port: '8728',
    mikrotik_user: '',
    mikrotik_password: '',
    company_header: '',
    footer_info: '',
    customerPortalOtp: false,
    otp_length: '6',
    pppoe_monitor_enable: true,
    rx_power_warning: '-27',
    rx_power_critical: '-30',
    whatsapp_keep_alive: true
  });

  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
    connected: false
  });

  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({
    admin: false,
    genieacs: false,
    mikrotik: false
  });
  const [selectedTab, setSelectedTab] = useState('system');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [generatingSecret, setGeneratingSecret] = useState(false);


  // Load initial data
  useEffect(() => {
    loadSettings();
    loadWhatsAppStatus();
    loadBackupFiles();
    loadActivityLogs();
  }, []);

  // Auto-refresh WhatsApp status while on WhatsApp tab (no page refresh needed)
  useEffect(() => {
    let intervalId: number | undefined;

    const startPolling = () => {
      // First tick immediately for responsiveness
      loadWhatsAppStatus();
      // Poll every 2 seconds
      intervalId = window.setInterval(() => {
        loadWhatsAppStatus();
      }, 2000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    if (selectedTab === 'whatsapp') {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [selectedTab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
        const response = await fetch('/api/admin/settings/data', {
            credentials: 'include'
        });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Convert string booleans to actual booleans
        const processedData = {
          ...data,
          customerPortalOtp: data.customerPortalOtp === 'true' || data.customerPortalOtp === true,
          pppoe_monitor_enable: data.pppoe_monitor_enable === 'true' || data.pppoe_monitor_enable === true,
          whatsapp_keep_alive: data.whatsapp_keep_alive === 'true' || data.whatsapp_keep_alive === true,
        };
        
        setSettings(processedData);
        
        if (data._cached) {
          toast.success('Pengaturan dimuat dari cache');
        }
      } else {
        throw new Error(data.message || data.error || 'Gagal memuat pengaturan');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Gagal memuat pengaturan: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Convert booleans back to strings for backend compatibility
      const dataToSend = {
        ...settings,
        customerPortalOtp: settings.customerPortalOtp.toString(),
        pppoe_monitor_enable: settings.pppoe_monitor_enable.toString(),
        whatsapp_keep_alive: settings.whatsapp_keep_alive.toString(),
      };
      
        // If admin credentials are present, automatically persist them to .env
        const shouldWriteEnv = !!settings.admin_username || !!settings.admin_password;
        const response = await fetch('/api/admin/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
            body: JSON.stringify({ ...dataToSend, writeEnv: shouldWriteEnv })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Pengaturan berhasil disimpan!');
        
        if (result.hotReload) {
          toast.success('Perubahan diterapkan tanpa restart', { duration: 3000 });
        }
        
        // Reload settings to get the latest data
        await loadSettings();
      } else {
        throw new Error(result.error || 'Gagal menyimpan pengaturan');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan pengaturan: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Session secret regeneration removed from UI

  const loadWhatsAppStatus = async () => {
    try {
        const response = await fetch('/api/admin/settings/whatsapp-status', {
            credentials: 'include'
        });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setWhatsappStatus({
          connected: data.connected || false,
          phoneNumber: data.phoneNumber,
          connectedSince: data.connectedSince,
          qr: data.qrCode
        });
      } else {
        console.error('Failed to load WhatsApp status:', data.message || data.error);
        setWhatsappStatus({
          connected: false,
          qr: undefined
        });
      }
    } catch (error) {
      console.error('Failed to load WhatsApp status:', error);
      setWhatsappStatus({
        connected: false,
        qr: undefined
      });
    }
  };

  const loadWhatsAppGroups = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sampleGroups = [
        {
          id: '120363123456789@g.us',
          name: 'Teknisi ISP',
          participants: 8,
          created: '2024-01-15',
          isAdmin: true
        },
        {
          id: '120363987654321@g.us',
          name: 'Customer Support',
          participants: 12,
          created: '2024-01-10',
          isAdmin: false
        }
      ];
      
      setWhatsappGroups(sampleGroups);
      toast.success(`Berhasil memuat ${sampleGroups.length} grup WhatsApp`);
    } catch (error) {
      toast.error('Gagal memuat grup WhatsApp');
    }
  };

  const loadBackupFiles = async () => {
    try {
      const sampleBackups = [
        {
          filename: 'backup_2024-01-15_10-30-00.sql',
          size: 2048576,
          created: '2024-01-15T10:30:00Z'
        },
        {
          filename: 'backup_2024-01-14_10-30-00.sql',
          size: 1987654,
          created: '2024-01-14T10:30:00Z'
        }
      ];
      setBackupFiles(sampleBackups);
    } catch (error) {
      console.error('Failed to load backup files');
    }
  };

  const loadActivityLogs = async () => {
    try {
      const sampleLogs = [
        {
          id: '1',
          user_id: 'admin',
          user_type: 'admin' as const,
          action: 'settings.save',
          description: 'Updated system settings',
          ip_address: '192.168.1.100',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: '081234567890',
          user_type: 'customer' as const,
          action: 'login',
          description: 'Customer portal login',
          ip_address: '192.168.1.101',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setActivityLogs(sampleLogs);
    } catch (error) {
      console.error('Failed to load activity logs');
    }
  };


  const refreshWhatsAppSession = async () => {
    try {
        const response = await fetch('/api/admin/settings/whatsapp-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Sesi WhatsApp telah direset');
        // Reload status after a short delay
        setTimeout(() => {
          loadWhatsAppStatus();
        }, 2000);
      } else {
        throw new Error(result.error || 'Gagal mereset sesi WhatsApp');
      }
    } catch (error) {
      console.error('Error refreshing WhatsApp session:', error);
      toast.error('Gagal mereset sesi WhatsApp: ' + (error as Error).message);
    }
  };
  
  const deleteWhatsAppSession = async () => {
    try {
        const response = await fetch('/api/admin/settings/whatsapp-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Sesi WhatsApp telah dihapus');
        // Reset the status immediately
        setWhatsappStatus({
          connected: false,
          qr: undefined
        });
        // Reload status after a short delay
        setTimeout(() => {
          loadWhatsAppStatus();
        }, 2000);
      } else {
        throw new Error(result.error || 'Gagal menghapus sesi WhatsApp');
      }
    } catch (error) {
      console.error('Error deleting WhatsApp session:', error);
      toast.error('Gagal menghapus sesi WhatsApp: ' + (error as Error).message);
    }
  };

  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.svg')) {
        toast.error('Format file tidak didukung. Gunakan PNG, JPG, JPEG, GIF, WEBP, atau SVG.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar. Maksimal 5MB.');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success('File logo dipilih. Klik Upload Logo untuk mengunggah.');
    }
  };
  
  const uploadLogo = async () => {
    if (!logoFile) {
      toast.error('Pilih file logo terlebih dahulu');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      // Fetch CSRF token and include in headers
      let csrfToken = '';
      try { csrfToken = await csrfManager.getToken(); } catch {}
        const response = await fetch('/api/admin/settings/upload-logo', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Logo berhasil diupload!');
        // Keep the preview as the current logo
      } else {
        throw new Error(result.error || 'Gagal mengupload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Gagal mengupload logo: ' + (error as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} berhasil disalin ke clipboard!`);
    }).catch(() => {
      toast.error('Gagal menyalin ke clipboard');
    });
  };

  const downloadScript = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`${filename} berhasil didownload!`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Manage system configuration and application settings</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="system" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Sistem</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="logo" className="gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Logo</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
        </TabsList>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Admin Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Admin Configuration</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_username">Admin Username</Label>
                      <Input
                        id="admin_username"
                        value={settings.admin_username}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, admin_username: e.target.value }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_password">Admin Password</Label>
                      <div className="relative">
                        <Input
                          id="admin_password"
                          type={showPasswords.admin ? 'text' : 'password'}
                          value={settings.admin_password}
                          onChange={(e) => {
                              setSettings(prev => ({ ...prev, admin_password: e.target.value }));
                            }}
                        />
                        <div className="absolute right-0 top-0 flex h-full items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-full px-3"
                            onClick={() => setShowPasswords(prev => ({ ...prev, admin: !prev.admin }))}
                          >
                            {showPasswords.admin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_header">Company Header</Label>
                      <Input
                        id="company_header"
                        value={settings.company_header}
                        onChange={(e) => setSettings(prev => ({ ...prev, company_header: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer_info">Footer Info</Label>
                      <Input
                        id="footer_info"
                        value={settings.footer_info}
                        onChange={(e) => setSettings(prev => ({ ...prev, footer_info: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* GenieACS Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">GenieACS Configuration</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="genieacs_url">GenieACS URL</Label>
                      <Input
                        id="genieacs_url"
                        value={settings.genieacs_url}
                        onChange={(e) => setSettings(prev => ({ ...prev, genieacs_url: e.target.value }))}
                        placeholder="http://localhost:7557"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="genieacs_username">Username</Label>
                        <Input
                          id="genieacs_username"
                          value={settings.genieacs_username}
                          onChange={(e) => setSettings(prev => ({ ...prev, genieacs_username: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="genieacs_password">Password</Label>
                        <div className="relative">
                          <Input
                            id="genieacs_password"
                            type={showPasswords.genieacs ? 'text' : 'password'}
                            value={settings.genieacs_password}
                            onChange={(e) => setSettings(prev => ({ ...prev, genieacs_password: e.target.value }))}
                          />
                          <div className="absolute right-0 top-0 flex h-full items-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-full px-3"
                              onClick={() => setShowPasswords(prev => ({ ...prev, genieacs: !prev.genieacs }))}
                            >
                              {showPasswords.genieacs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MikroTik Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">MikroTik Configuration</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mikrotik_host">Host/IP</Label>
                        <Input
                          id="mikrotik_host"
                          value={settings.mikrotik_host}
                          onChange={(e) => setSettings(prev => ({ ...prev, mikrotik_host: e.target.value }))}
                          placeholder="192.168.1.1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mikrotik_port">Port</Label>
                        <Input
                          id="mikrotik_port"
                          value={settings.mikrotik_port}
                          onChange={(e) => setSettings(prev => ({ ...prev, mikrotik_port: e.target.value }))}
                          placeholder="8728"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mikrotik_user">Username</Label>
                        <Input
                          id="mikrotik_user"
                          value={settings.mikrotik_user}
                          onChange={(e) => setSettings(prev => ({ ...prev, mikrotik_user: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mikrotik_password">Password</Label>
                        <div className="relative">
                          <Input
                            id="mikrotik_password"
                            type={showPasswords.mikrotik ? 'text' : 'password'}
                            value={settings.mikrotik_password}
                            onChange={(e) => setSettings(prev => ({ ...prev, mikrotik_password: e.target.value }))}
                          />
                          <div className="absolute right-0 top-0 flex h-full items-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-full px-3"
                              onClick={() => setShowPasswords(prev => ({ ...prev, mikrotik: !prev.mikrotik }))}
                            >
                              {showPasswords.mikrotik ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* main_interface setting removed - dashboard requires explicit interface selection */}
                  </div>
                </div>
              </div>

              {/* System Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Customer Portal OTP</Label>
                      <p className="text-sm text-gray-500">Enable OTP for customer login</p>
                    </div>
                    <Switch
                      checked={settings.customerPortalOtp}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, customerPortalOtp: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>PPPoE Monitor</Label>
                      <p className="text-sm text-gray-500">Enable PPPoE monitoring</p>
                    </div>
                    <Switch
                      checked={settings.pppoe_monitor_enable}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pppoe_monitor_enable: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>WhatsApp Keep Alive</Label>
                      <p className="text-sm text-gray-500">Keep WhatsApp connection alive</p>
                    </div>
                    <Switch
                      checked={settings.whatsapp_keep_alive}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, whatsapp_keep_alive: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                

                <Button onClick={saveSettings} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  WhatsApp Gateway
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div>
                    {whatsappStatus.connected ? (
                      <Badge variant="default" className="gap-2 bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        Terhubung
                        {whatsappStatus.phoneNumber && (
                          <span className="ml-1">({whatsappStatus.phoneNumber})</span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Belum Terhubung
                      </Badge>
                    )}
                  </div>

                  {!whatsappStatus.connected && whatsappStatus.qr && (
                    <div className="flex justify-center">
                      <div className="p-4 bg-white border rounded-lg shadow-sm">
                        <img 
                          src={whatsappStatus.qr} 
                          alt="QR Code WhatsApp" 
                          className="h-48 w-48 mx-auto"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <p className="text-sm text-gray-500 mt-2 text-center">Scan QR Code dengan WhatsApp</p>
                      </div>
                    </div>
                  )}
                  
                  {!whatsappStatus.connected && !whatsappStatus.qr && (
                    <div className="flex justify-center">
                      <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 text-center">Menunggu QR Code...</p>
                        <p className="text-xs text-gray-400 text-center mt-1">Klik Refresh QR jika QR code tidak muncul</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={refreshWhatsAppSession} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh QR
                    </Button>
                    <Button variant="outline" size="sm" onClick={deleteWhatsAppSession} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Hapus Session
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Penting!</strong> Gunakan nomor WhatsApp khusus untuk bot, bukan nomor admin pribadi.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* WhatsApp Groups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    WhatsApp Groups
                  </div>
                  <Badge variant="outline">{whatsappGroups.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadWhatsAppGroups} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Load Groups
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Wifi className="h-4 w-4" />
                    Test Connection
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {whatsappGroups.length > 0 ? (
                    whatsappGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{group.name}</span>
                            {group.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">{group.participants} anggota • {group.created}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(group.id, 'Group ID')}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada grup WhatsApp</p>
                      <p className="text-sm">Klik "Load Groups" untuk memuat</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logo Tab */}
        <TabsContent value="logo" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo Aplikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo-upload">Upload Logo Baru</Label>
                    <div className="mt-2">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*,.svg"
                        onChange={handleLogoSelect}
                        className="file:mr-4 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Format: PNG, JPG, JPEG, GIF, WEBP, SVG. Maksimal 5MB.
                    </p>
                  </div>
                  <Button 
                    onClick={uploadLogo} 
                    disabled={!logoFile || uploadingLogo}
                    className="gap-2"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadingLogo ? 'Mengupload...' : 'Upload Logo'}
                  </Button>
                </div>
              
                <div className="space-y-4">
                  <Label>Preview Logo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center">
                    {logoPreview ? (
                      <div className="space-y-2">
                        <img 
                          src={logoPreview} 
                          alt="Preview Logo" 
                          className="max-w-full max-h-32 mx-auto object-contain"
                        />
                        <p className="text-sm text-gray-600">Preview logo baru</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="h-16 w-16 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500">Pilih file untuk melihat preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>



        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Buat backup database billing untuk keamanan data.
                </p>
                <Button className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Buat Backup
                </Button>
              </CardContent>
            </Card>

            {/* Restore Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restore Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Restore database dari file backup yang tersedia.
                </p>
                <div className="space-y-2">
                  <Label>Pilih File Backup</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih file backup..." />
                    </SelectTrigger>
                    <SelectContent>
                      {backupFiles.map((file) => (
                        <SelectItem key={file.filename} value={file.filename}>
                          {file.filename} ({formatFileSize(file.size)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="h-4 w-4" />
                  Restore Database
                </Button>
              </CardContent>
            </Card>
          {/* Backup History */}
          <Card className="mt-0 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Riwayat Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nama File</th>
                      <th className="text-left p-2">Ukuran</th>
                      <th className="text-left p-2">Tanggal Dibuat</th>
                      <th className="text-left p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupFiles.map((file) => (
                      <tr key={file.filename} className="border-b">
                        <td className="p-2 font-mono text-sm">{file.filename}</td>
                        <td className="p-2">{formatFileSize(file.size)}</td>
                        <td className="p-2">{new Date(file.created).toLocaleString('id-ID')}</td>
                        <td className="p-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Restore
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Activity Logs */}
          <Card className="mt-6 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Logs
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear Old Logs
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Waktu</th>
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Tipe</th>
                      <th className="text-left p-2">Aksi</th>
                      <th className="text-left p-2">Deskripsi</th>
                      <th className="text-left p-2">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="p-2 text-sm">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                        <td className="p-2 font-medium">{log.user_id}</td>
                        <td className="p-2">
                          <Badge variant={log.user_type === 'admin' ? 'default' : 'secondary'}>
                            {log.user_type === 'admin' ? 'Admin' : 'Customer'}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-sm">{log.action}</td>
                        <td className="p-2">{log.description}</td>
                        <td className="p-2 text-sm">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
