import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Terminal, 
  Router, 
  Wifi, 
  Shield, 
  Server, 
  Activity,
  Copy,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface Command {
  command: string;
  description: string;
  category: string;
  example?: string;
  parameters?: string;
}

const commands: Command[] = [
  // GenieACS Commands
  {
    command: 'devices',
    description: 'Daftar semua perangkat yang terdaftar',
    category: 'GenieACS',
    example: 'devices'
  },
  {
    command: 'cekall',
    description: 'Cek status semua perangkat',
    category: 'GenieACS',
    example: 'cekall'
  },
  {
    command: 'search [nomor]',
    description: 'Cari perangkat berdasarkan nomor pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'search 081234567890'
  },
  {
    command: 'cek [nomor]',
    description: 'Cek status ONU berdasarkan nomor pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'cek 081234567890'
  },
  {
    command: 'cekstatus [nomor]',
    description: 'Cek status lengkap pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'cekstatus 081234567890'
  },
  {
    command: 'admincheck [nomor]',
    description: 'Cek perangkat dengan akses admin',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'admincheck 081234567890'
  },
  {
    command: 'gantissid [nomor] [ssid]',
    description: 'Ubah SSID WiFi pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan, ssid: Nama WiFi baru',
    example: 'gantissid 081234567890 MyWiFi'
  },
  {
    command: 'gantipass [nomor] [pass]',
    description: 'Ubah password WiFi pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan, pass: Password baru',
    example: 'gantipass 081234567890 newpassword123'
  },
  {
    command: 'reboot [nomor]',
    description: 'Restart ONU pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'reboot 081234567890'
  },
  {
    command: 'factory reset [nomor]',
    description: 'Reset factory ONU pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'factory reset 081234567890'
  },
  {
    command: 'refresh',
    description: 'Refresh data perangkat dari GenieACS',
    category: 'GenieACS',
    example: 'refresh'
  },
  {
    command: 'tag [nomor] [tag]',
    description: 'Tambah tag pada pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan, tag: Tag yang akan ditambahkan',
    example: 'tag 081234567890 premium'
  },
  {
    command: 'untag [nomor] [tag]',
    description: 'Hapus tag dari pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan, tag: Tag yang akan dihapus',
    example: 'untag 081234567890 premium'
  },
  {
    command: 'tags [nomor]',
    description: 'Lihat semua tags pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'tags 081234567890'
  },
  {
    command: 'adminssid [nomor] [ssid]',
    description: 'Admin ubah SSID pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan, ssid: SSID baru',
    example: 'adminssid 081234567890 NewSSID'
  },
  {
    command: 'adminrestart [nomor]',
    description: 'Admin restart ONU pelanggan',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'adminrestart 081234567890'
  },
  {
    command: 'adminfactory [nomor]',
    description: 'Admin factory reset ONU',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'adminfactory 081234567890'
  },
  {
    command: 'confirm admin factory reset [nomor]',
    description: 'Konfirmasi factory reset admin',
    category: 'GenieACS',
    parameters: 'nomor: Nomor pelanggan',
    example: 'confirm admin factory reset 081234567890'
  },

  // PPPoE & Mikrotik Commands
  {
    command: 'interfaces',
    description: 'Daftar semua interface MikroTik',
    category: 'PPPoE & Mikrotik',
    example: 'interfaces'
  },
  {
    command: 'interface [nama]',
    description: 'Detail interface tertentu',
    category: 'PPPoE & Mikrotik',
    parameters: 'nama: Nama interface',
    example: 'interface ether1'
  },
  {
    command: 'enableif [nama]',
    description: 'Aktifkan interface',
    category: 'PPPoE & Mikrotik',
    parameters: 'nama: Nama interface',
    example: 'enableif ether1'
  },
  {
    command: 'disableif [nama]',
    description: 'Nonaktifkan interface',
    category: 'PPPoE & Mikrotik',
    parameters: 'nama: Nama interface',
    example: 'disableif ether2'
  },
  {
    command: 'ipaddress',
    description: 'Daftar alamat IP yang dikonfigurasi',
    category: 'PPPoE & Mikrotik',
    example: 'ipaddress'
  },
  {
    command: 'routes',
    description: 'Tampilkan tabel routing',
    category: 'PPPoE & Mikrotik',
    example: 'routes'
  },
  {
    command: 'dhcp',
    description: 'Daftar DHCP leases aktif',
    category: 'PPPoE & Mikrotik',
    example: 'dhcp'
  },
  {
    command: 'ping [ip] [count]',
    description: 'Test ping ke alamat IP',
    category: 'PPPoE & Mikrotik',
    parameters: 'ip: Alamat IP tujuan, count: Jumlah ping (opsional)',
    example: 'ping 8.8.8.8 5'
  },
  {
    command: 'logs [topics] [count]',
    description: 'Tampilkan log MikroTik',
    category: 'PPPoE & Mikrotik',
    parameters: 'topics: Topik log (opsional), count: Jumlah log (opsional)',
    example: 'logs system 10'
  },
  {
    command: 'firewall [chain]',
    description: 'Status firewall berdasarkan chain',
    category: 'PPPoE & Mikrotik',
    parameters: 'chain: Chain firewall (input/forward/output)',
    example: 'firewall input'
  },
  {
    command: 'users',
    description: 'Daftar semua user PPPoE',
    category: 'PPPoE & Mikrotik',
    example: 'users'
  },
  {
    command: 'profiles [type]',
    description: 'Daftar profile berdasarkan tipe',
    category: 'PPPoE & Mikrotik',
    parameters: 'type: Tipe profile (pppoe/hotspot)',
    example: 'profiles pppoe'
  },
  {
    command: 'identity [nama]',
    description: 'Info identitas router',
    category: 'PPPoE & Mikrotik',
    parameters: 'nama: Nama identitas baru (opsional)',
    example: 'identity MyRouter'
  },
  {
    command: 'clock',
    description: 'Tampilkan waktu sistem router',
    category: 'PPPoE & Mikrotik',
    example: 'clock'
  },
  {
    command: 'resource',
    description: 'Info resource sistem (CPU, Memory, dll)',
    category: 'PPPoE & Mikrotik',
    example: 'resource'
  },
  {
    command: 'reboot',
    description: 'Restart router MikroTik',
    category: 'PPPoE & Mikrotik',
    example: 'reboot'
  },
  {
    command: 'confirm restart',
    description: 'Konfirmasi restart router',
    category: 'PPPoE & Mikrotik',
    example: 'confirm restart'
  },
  {
    command: 'addtag [device_id] [nomor]',
    description: 'Tambah tag pada perangkat',
    category: 'PPPoE & Mikrotik',
    parameters: 'device_id: ID perangkat, nomor: Nomor pelanggan',
    example: 'addtag 12345 081234567890'
  },

  // Hotspot & PPPoE Management
  {
    command: 'vcr [user] [profile] [nomor]',
    description: 'Buat voucher hotspot',
    category: 'Hotspot & PPPoE',
    parameters: 'user: Username, profile: Profile, nomor: Nomor pelanggan',
    example: 'vcr user123 1hari 081234567890'
  },
  {
    command: 'hotspot',
    description: 'Daftar user hotspot yang aktif',
    category: 'Hotspot & PPPoE',
    example: 'hotspot'
  },
  {
    command: 'pppoe',
    description: 'Daftar user PPPoE yang aktif',
    category: 'Hotspot & PPPoE',
    example: 'pppoe'
  },
  {
    command: 'offline',
    description: 'Daftar user PPPoE yang offline',
    category: 'Hotspot & PPPoE',
    example: 'offline'
  },
  {
    command: 'addhotspot [user] [pass] [profile]',
    description: 'Tambah user hotspot baru',
    category: 'Hotspot & PPPoE',
    parameters: 'user: Username, pass: Password, profile: Profile',
    example: 'addhotspot user123 pass123 1hari'
  },
  {
    command: 'addpppoe [user] [pass] [profile] [ip]',
    description: 'Tambah user PPPoE baru',
    category: 'Hotspot & PPPoE',
    parameters: 'user: Username, pass: Password, profile: Profile, ip: IP Address (opsional)',
    example: 'addpppoe user123 pass123 10mbps 192.168.1.100'
  },
  {
    command: 'setprofile [user] [profile]',
    description: 'Ubah profile user',
    category: 'Hotspot & PPPoE',
    parameters: 'user: Username, profile: Profile baru',
    example: 'setprofile user123 20mbps'
  },
  {
    command: 'delhotspot [username]',
    description: 'Hapus user hotspot',
    category: 'Hotspot & PPPoE',
    parameters: 'username: Username yang akan dihapus',
    example: 'delhotspot user123'
  },
  {
    command: 'delpppoe [username]',
    description: 'Hapus user PPPoE',
    category: 'Hotspot & PPPoE',
    parameters: 'username: Username yang akan dihapus',
    example: 'delpppoe user123'
  },
  {
    command: 'addpppoe_tag [user] [nomor]',
    description: 'Tambah tag pada user PPPoE',
    category: 'Hotspot & PPPoE',
    parameters: 'user: Username, nomor: Nomor pelanggan',
    example: 'addpppoe_tag user123 081234567890'
  },
  {
    command: 'member [username] [profile] [nomor]',
    description: 'Tambah member baru',
    category: 'Hotspot & PPPoE',
    parameters: 'username: Username, profile: Profile, nomor: Nomor pelanggan',
    example: 'member user123 10mbps 081234567890'
  },
  {
    command: 'list',
    description: 'Daftar semua user (hotspot dan PPPoE)',
    category: 'Hotspot & PPPoE',
    example: 'list'
  },
  {
    command: 'remove [username]',
    description: 'Hapus user (generic)',
    category: 'Hotspot & PPPoE',
    parameters: 'username: Username yang akan dihapus',
    example: 'remove user123'
  },
  {
    command: 'addadmin [nomor]',
    description: 'Tambah nomor admin',
    category: 'Hotspot & PPPoE',
    parameters: 'nomor: Nomor admin baru',
    example: 'addadmin 081234567890'
  },
  {
    command: 'removeadmin [nomor]',
    description: 'Hapus nomor admin',
    category: 'Hotspot & PPPoE',
    parameters: 'nomor: Nomor admin yang akan dihapus',
    example: 'removeadmin 081234567890'
  },

  // Sistem & Admin
  {
    command: 'otp [nomor]',
    description: 'Kirim OTP ke nomor pelanggan',
    category: 'Sistem & Admin',
    parameters: 'nomor: Nomor pelanggan',
    example: 'otp 081234567890'
  },
  {
    command: 'status',
    description: 'Status sistem secara keseluruhan',
    category: 'Sistem & Admin',
    example: 'status'
  },
  {
    command: 'logs',
    description: 'Tampilkan log aplikasi',
    category: 'Sistem & Admin',
    example: 'logs'
  },
  {
    command: 'restart',
    description: 'Restart aplikasi',
    category: 'Sistem & Admin',
    example: 'restart'
  },
  {
    command: 'debug resource',
    description: 'Debug informasi resource sistem',
    category: 'Sistem & Admin',
    example: 'debug resource'
  },
  {
    command: 'checkgroup',
    description: 'Cek status grup WhatsApp',
    category: 'Sistem & Admin',
    example: 'checkgroup'
  },
  {
    command: 'setadmin [nomor]',
    description: 'Set nomor admin utama',
    category: 'Sistem & Admin',
    parameters: 'nomor: Nomor admin',
    example: 'setadmin 081234567890'
  },
  {
    command: 'settechnician [nomor]',
    description: 'Set nomor teknisi',
    category: 'Sistem & Admin',
    parameters: 'nomor: Nomor teknisi',
    example: 'settechnician 081234567890'
  },
  {
    command: 'setheader [teks]',
    description: 'Set header pesan WhatsApp',
    category: 'Sistem & Admin',
    parameters: 'teks: Teks header',
    example: 'setheader ISP AxeLink'
  },
  {
    command: 'setfooter [teks]',
    description: 'Set footer pesan WhatsApp',
    category: 'Sistem & Admin',
    parameters: 'teks: Teks footer',
    example: 'setfooter Powered by AxeApps'
  },
  {
    command: 'setgenieacs [url] [user] [pass]',
    description: 'Set konfigurasi GenieACS',
    category: 'Sistem & Admin',
    parameters: 'url: URL GenieACS, user: Username, pass: Password',
    example: 'setgenieacs http://localhost:7557 admin password'
  },
  {
    command: 'setmikrotik [host] [port] [user] [pass]',
    description: 'Set konfigurasi MikroTik',
    category: 'Sistem & Admin',
    parameters: 'host: Host/IP, port: Port, user: Username, pass: Password',
    example: 'setmikrotik 192.168.1.1 8728 admin password'
  },
  {
    command: 'genieacs stop',
    description: 'Stop service GenieACS',
    category: 'Sistem & Admin',
    example: 'genieacs stop'
  },
  {
    command: 'genieacs start060111',
    description: 'Start service GenieACS',
    category: 'Sistem & Admin',
    example: 'genieacs start060111'
  },
  {
    command: 'admin',
    description: 'Tampilkan menu admin',
    category: 'Sistem & Admin',
    example: 'admin'
  },
  {
    command: 'help',
    description: 'Tampilkan bantuan perintah',
    category: 'Sistem & Admin',
    example: 'help'
  },
  {
    command: 'ya/iya/yes',
    description: 'Konfirmasi positif untuk perintah',
    category: 'Sistem & Admin',
    example: 'ya'
  },
  {
    command: 'tidak/no/batal',
    description: 'Konfirmasi negatif untuk perintah',
    category: 'Sistem & Admin',
    example: 'tidak'
  },
  {
    command: 'addwan [interface]',
    description: 'Tambah interface WAN',
    category: 'Sistem & Admin',
    parameters: 'interface: Nama interface',
    example: 'addwan ether1'
  },

  // WiFi & Layanan (Customer Commands)
  {
    command: 'info wifi',
    description: 'Info WiFi pelanggan',
    category: 'WiFi & Layanan',
    example: 'info wifi'
  },
  {
    command: 'info',
    description: 'Info layanan pelanggan',
    category: 'WiFi & Layanan',
    example: 'info'
  },
  {
    command: 'gantiwifi [ssid]',
    description: 'Ganti nama WiFi (customer)',
    category: 'WiFi & Layanan',
    parameters: 'ssid: Nama WiFi baru',
    example: 'gantiwifi MyNewWiFi'
  },
  {
    command: 'gantipass [password]',
    description: 'Ganti password WiFi (customer)',
    category: 'WiFi & Layanan',
    parameters: 'password: Password baru',
    example: 'gantipass newpassword123'
  },
  {
    command: 'speedtest',
    description: 'Test kecepatan internet',
    category: 'WiFi & Layanan',
    example: 'speedtest'
  },
  {
    command: 'diagnostic',
    description: 'Diagnostik perangkat pelanggan',
    category: 'WiFi & Layanan',
    example: 'diagnostic'
  },
  {
    command: 'history',
    description: 'Riwayat perangkat pelanggan',
    category: 'WiFi & Layanan',
    example: 'history'
  },
  {
    command: 'menu',
    description: 'Menu utama customer',
    category: 'WiFi & Layanan',
    example: 'menu'
  },
  {
    command: 'factory reset',
    description: 'Reset factory (pelanggan)',
    category: 'WiFi & Layanan',
    example: 'factory reset'
  },
  {
    command: 'confirm factory reset',
    description: 'Konfirmasi factory reset pelanggan',
    category: 'WiFi & Layanan',
    example: 'confirm factory reset'
  }
];

const categoryIcons = {
  'GenieACS': Server,
  'PPPoE & Mikrotik': Router,
  'Hotspot & PPPoE': Wifi,
  'Sistem & Admin': Shield,
  'WiFi & Layanan': Activity
};

const categoryColors = {
  'GenieACS': 'bg-green-100 text-green-800',
  'PPPoE & Mikrotik': 'bg-blue-100 text-blue-800',
  'Hotspot & PPPoE': 'bg-yellow-100 text-yellow-800',
  'Sistem & Admin': 'bg-purple-100 text-purple-800',
  'WiFi & Layanan': 'bg-orange-100 text-orange-800'
};

export default function CommandReference() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = Array.from(new Set(commands.map(cmd => cmd.category)));

  const filteredCommands = commands.filter(command => {
    const matchesSearch = searchQuery === '' || 
      command.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      command.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || command.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command).then(() => {
      toast.success(`Command "${command}" berhasil disalin!`);
    }).catch(() => {
      toast.error('Gagal menyalin command');
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Command Reference
          </h1>
          <p className="text-gray-600 mt-1">Referensi lengkap perintah WhatsApp untuk sistem AxeApps</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {filteredCommands.length} Commands
        </Badge>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari command atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => {
                const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === category
                        ? categoryColors[category as keyof typeof categoryColors]
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden sm:inline">{category}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCommands.map((command, index) => {
          const IconComponent = categoryIcons[command.category as keyof typeof categoryIcons];
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`gap-1 ${categoryColors[command.category as keyof typeof categoryColors]}`}
                      >
                        <IconComponent className="h-3 w-3" />
                        {command.category}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-gray-500" />
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {command.command}
                        </code>
                      </div>
                      <p className="text-gray-700">{command.description}</p>
                    </div>

                    {command.parameters && (
                      <div className="text-sm text-gray-600">
                        <strong>Parameters:</strong> {command.parameters}
                      </div>
                    )}

                    {command.example && (
                      <div className="bg-gray-50 p-2 rounded text-sm">
                        <strong className="text-gray-700">Example:</strong>
                        <code className="ml-2 text-blue-600">{command.example}</code>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => copyCommand(command.command)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Copy command"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCommands.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada command ditemukan</h3>
            <p className="text-gray-500">
              Coba ubah kata kunci pencarian atau pilih kategori yang berbeda
            </p>
          </CardContent>
        </Card>
      )}

      {/* Command Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statistik Commands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((category) => {
              const count = commands.filter(cmd => cmd.category === category).length;
              const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
              return (
                <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{category}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}