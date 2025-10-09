import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, Eye, EyeOff } from "lucide-react";
import { 
  Router, 
  UserCheck, 
  UserX, 
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Zap,
  Clock,
  Activity,
  AlertCircle,
  Save,
  X
} from 'lucide-react';

interface PPPoEUser {
  id: string;
  username: string;
  password: string;
  profile: string;
  active: boolean;
  lastLogin: string;
  ipAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

interface PPPoEProfile {
  id: string;
  name: string;
  rateLimit: string;
  description: string;
}

interface UserFormData {
  username: string;
  password: string;
  profile: string;
  remoteAddress: string;
  localAddress: string;
}

export default function MikrotikManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PPPoEUser[]>([]);
  const [profiles, setProfiles] = useState<PPPoEProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PPPoEUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PPPoEUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>({ 
    username: '', 
    password: '', 
    profile: '', 
    remoteAddress: '',
    localAddress: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profiles from backend API
      const profilesResponse = await fetch('/api/admin/mikrotik/profiles/api', {
        credentials: 'include'
      });
      const profilesData = await profilesResponse.json();
      
      if (!profilesData.success) {
        throw new Error(profilesData.message || 'Failed to fetch profiles');
      }
      
      // Transform profiles data to match our interface
      const profiles: PPPoEProfile[] = profilesData.profiles.map((profile: any) => ({
        id: profile['.id'] || profile.id,
        name: profile.name || profile['.name'] || 'Unknown',
        rateLimit: profile['rate-limit'] || 'N/A',
        description: profile.comment || `Profile ${profile.name}`
      }));
      
      // Fetch users from backend API
      const usersResponse = await fetch('/api/admin/mikrotik/users/api', {
        credentials: 'include'
      });
      const usersData = await usersResponse.json();
      
      if (!usersData.success) {
        throw new Error(usersData.message || 'Failed to fetch users');
      }
      
      // Transform users data to match our interface
      const users: PPPoEUser[] = usersData.users.map((user: any) => {
        // Normalize/parse various possible mikrotik field names and ensure numeric values
        const rawBytesIn = user.bytesIn ?? user['bytes-in'] ?? user['rx-byte'] ?? user['rx-bytes'] ?? user['rx-bytes-total'] ?? 0;
        const rawBytesOut = user.bytesOut ?? user['bytes-out'] ?? user['tx-byte'] ?? user['tx-bytes'] ?? user['tx-bytes-total'] ?? 0;
        const bytesIn = typeof rawBytesIn === 'string' ? parseInt(rawBytesIn.replace(/[^0-9]/g, '')) || 0 : Number(rawBytesIn) || 0;
        const bytesOut = typeof rawBytesOut === 'string' ? parseInt(rawBytesOut.replace(/[^0-9]/g, '')) || 0 : Number(rawBytesOut) || 0;

        return {
          id: user.id || user['.id'] || Math.random().toString(),
          username: user.username || user.name,
          password: '••••••••', // Always hide password in frontend
          profile: user.profile || 'Unknown',
          active: !!user.active,
          lastLogin: user.lastLogin || user['last-logged-out'] || 'N/A',
          ipAddress: user.ipAddress || user.address || '-',
          uptime: user.uptime || '-',
          bytesIn,
          bytesOut
        } as PPPoEUser;
      });
      
      setProfiles(profiles);
      setUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      
      // Provide fallback data when backend is unavailable
      const fallbackProfiles: PPPoEProfile[] = [
        { id: '1', name: '10Mbps', rateLimit: '10M/10M', description: '10 Mbps Up/Down' },
        { id: '2', name: '20Mbps', rateLimit: '20M/20M', description: '20 Mbps Up/Down' },
        { id: '3', name: '50Mbps', rateLimit: '50M/50M', description: '50 Mbps Up/Down' }
      ];
      
      setProfiles(fallbackProfiles);
      setUsers([]);
      setFilteredUsers([]);
      
      setAlert({ 
        type: 'error', 
        message: error instanceof Error 
          ? `Connection error: ${error.message}` 
          : 'Failed to connect to backend. Using fallback data.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.profile.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.active : !user.active
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', profile: '', remoteAddress: '', localAddress: '' });
    setShowUserModal(true);
  };

  const handleEditUser = (user: PPPoEUser) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      // Do not prefill masked password; require admin to enter new password to change it
      password: '',
      profile: user.profile,
      remoteAddress: user.ipAddress || '',
      localAddress: ''
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.profile) {
      setAlert({ type: 'error', message: 'Username and profile are required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = editingUser 
        ? '/api/admin/mikrotik/edit-user'
        : '/api/admin/mikrotik/add-user';
      
      // For edit: only include password if admin entered a new one
      const requestBody: any = {
        ...(editingUser && { id: editingUser.id }),
        username: userForm.username,
        profile: userForm.profile
      };
      if (!editingUser || (editingUser && userForm.password && userForm.password.length > 0)) {
        requestBody.password = userForm.password;
      }
      
      // Include remote address if provided
      if (userForm.remoteAddress) {
        requestBody.remoteAddress = userForm.remoteAddress;
      }
      
      // Include local address if provided
      if (userForm.localAddress) {
        requestBody.localAddress = userForm.localAddress;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to save user');
      }
      
      if (editingUser) {
        // Update existing user in the UI
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                username: userForm.username,
                profile: userForm.profile,
                // Only update password in UI if it was changed
                ...(userForm.password ? { password: '••••••••' } : {}),
                // Update IP address if remote address was provided
                ...(userForm.remoteAddress ? { ipAddress: userForm.remoteAddress } : {})
              }
            : user
        ));
        setAlert({ type: 'success', message: 'User updated successfully' });
      } else {
        // Refresh the data to get the new user with proper ID from backend
        await fetchData();
        setAlert({ type: 'success', message: 'User added successfully' });
      }

      setShowUserModal(false);
    } catch (error) {
      console.error('Error saving user:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save user' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch('/api/admin/mikrotik/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ id: userId })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete user');
      }
      
      // Remove user from the UI and refresh data
      setUsers(prev => prev.filter(user => user.id !== userId));
      setAlert({ type: 'success', message: 'User deleted successfully' });
      
      // Optionally refresh data to ensure consistency
      setTimeout(() => fetchData(), 1000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete user' 
      });
    }
  };

  const handleDisconnectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to disconnect this user?')) return;

    try {
      // Find the user to get the username
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const response = await fetch('/api/admin/mikrotik/disconnect-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username: user.username })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to disconnect user');
      }
      
      // Update user status in the UI
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, active: false, ipAddress: '-', uptime: '-' }
          : u
      ));
      setAlert({ type: 'success', message: 'User session disconnected successfully' });
      
      // Refresh data after a short delay to get updated status
      setTimeout(() => fetchData(), 2000);
    } catch (error) {
      console.error('Error disconnecting user:', error);
      setAlert({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to disconnect user' 
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes && bytes !== 0) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const value = bytes / Math.pow(k, i);
    // Format with two decimals and use locale number formatting for readability
    const formatted = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value.toFixed(2)));
    return `${formatted} ${sizes[i]}`;
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    inactive: users.filter(u => !u.active).length
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Router className="h-8 w-8 text-blue-600" />
            PPPoE User Management</h1>
          <p className="text-gray-600">Manage Mikrotik PPPoE users and connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} disabled={isLoading} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddUser} size="sm" className="flex items-center gap-2">
            <Plus className="h-3 w-3" />
            Add User
          </Button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert className={alert.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium">Total Users</CardTitle>
            <Users className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-lg lg:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium">Active Sessions</CardTitle>
            <UserCheck className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-lg lg:text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-3 w-3 lg:h-4 lg:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-lg lg:text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by username, profile, or IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({users.length})
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Active ({stats.active})
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
              >
                Inactive ({stats.inactive})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>PPPoE Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Data Usage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-gray-500">Password: ••••••••</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">{user.profile}</Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {user.active ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Activity className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {user.lastLogin}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">IP: {user.ipAddress}</div>
                        <div className="text-xs text-gray-500">Uptime: {user.uptime}</div>
                      </div>
                    </TableCell>
                    
                    

                    <TableCell>
                      <div className="text-sm flex items-center gap-1" title={`${user.bytesOut} bytes`}>
                        <Download className="w-4 h-4 text-blue-600" />
                        {formatBytes(user.bytesOut)}
                      </div>

                      <div className="text-sm flex items-center gap-1" title={`${user.bytesIn} bytes`}>
                        <Upload className="w-4 h-4 text-green-600" />
                        {formatBytes(user.bytesIn)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {user.active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnectUser(user.id)}
                          >
                            <Zap className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit PPPoE User' : 'Add PPPoE User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={userForm.username}
                onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="user@domain.com"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password {editingUser ? <span className="text-xs text-gray-400">(leave empty to keep current)</span> : null}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? 'Enter new password to change' : 'Enter password'}
                />
                <button type="button" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500" onClick={() => setShowPassword(prev => !prev)}>
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="localAddress">Local Address <span className="text-xs text-gray-400">(leave empty to keep current)</span></Label>
              <Input
                id="localAddress"
                placeholder="Local Address"
                value={userForm.localAddress}
                onChange={(e) => setUserForm(prev => ({ ...prev, localAddress: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="remoteAddress">Remote Address <span className="text-xs text-gray-400">(Leave blank for dynamic IP assignment)</span></Label>
              <Input
                id="remoteAddress"
                placeholder="Remote Address"
                value={userForm.remoteAddress}
                onChange={(e) => setUserForm(prev => ({ ...prev, remoteAddress: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="profile">Profile</Label>
              <Select 
                value={userForm.profile} 
                onValueChange={(value) => setUserForm(prev => ({ ...prev, profile: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.name}>
                      {profile.name} - {profile.rateLimit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingUser ? 'Update' : 'Add'} User
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}