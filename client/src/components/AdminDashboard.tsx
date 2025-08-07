
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, DashboardStats, CreateUserInput } from '../../../server/src/schema';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // User registration state
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const [userFormData, setUserFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    role: 'DONOR' as const
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const dashboardStats = await trpc.getDashboardStats.query();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle user registration
  const handleUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegistrationMessage(null);
    
    try {
      await trpc.createUser.mutate(userFormData);
      setRegistrationMessage({
        type: 'success',
        message: `Pengguna dengan email ${userFormData.email} berhasil didaftarkan sebagai ${userFormData.role}.`
      });
      
      // Reset form
      setUserFormData({
        email: '',
        password: '',
        role: 'DONOR' as const
      });
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsRegistrationDialogOpen(false);
        setRegistrationMessage(null);
      }, 2000);
      
    } catch (error) {
      console.error('Registration failed:', error);
      setRegistrationMessage({
        type: 'error',
        message: 'Gagal mendaftarkan pengguna. Pastikan email belum terdaftar dan coba lagi.'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const statCards = [
    {
      title: 'Total Anak Asuh',
      value: stats?.total_children || 0,
      description: `${stats?.active_children || 0} aktif`,
      icon: '👶',
      color: 'bg-blue-500'
    },
    {
      title: 'Total Donatur',
      value: stats?.total_donors || 0,
      description: 'Donatur terdaftar',
      icon: '💝',
      color: 'bg-green-500'
    },
    {
      title: 'Total Pengurus',
      value: stats?.total_staff || 0,
      description: 'Staf aktif',
      icon: '👥',
      color: 'bg-purple-500'
    },
    {
      title: 'Total Donasi',
      value: `Rp ${(stats?.total_donations || 0).toLocaleString('id-ID')}`,
      description: 'Donasi diterima',
      icon: '💰',
      color: 'bg-emerald-500'
    },
    {
      title: 'Total Pengeluaran',
      value: `Rp ${(stats?.total_expenses || 0).toLocaleString('id-ID')}`,
      description: 'Pengeluaran tercatat',
      icon: '📋',
      color: 'bg-red-500'
    },
    {
      title: 'Kegiatan Terbaru',
      value: stats?.recent_activities || 0,
      description: 'Aktivitas bulan ini',
      icon: '🎭',
      color: 'bg-orange-500'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrator</h2>
            <p className="text-gray-600 mt-1">Selamat datang, {user.email}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrator</h2>
          <p className="text-gray-600 mt-1">Selamat datang, {user.email} 👋</p>
        </div>
        <Button 
          onClick={loadDashboardData}
          variant="outline"
          size="sm"
        >
          🔄 Refresh Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stat.description}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="management">Manajemen</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Ringkasan Keuangan</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Total Donasi</span>
                    <span className="text-lg font-bold text-green-900">
                      Rp {(stats?.total_donations || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-red-700">Total Pengeluaran</span>
                    <span className="text-lg font-bold text-red-900">
                      Rp {(stats?.total_expenses || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">Saldo</span>
                    <span className="text-lg font-bold text-blue-900">
                      Rp {((stats?.total_donations || 0) - (stats?.total_expenses || 0)).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🏃</span>
                  <span>Aktivitas Terkini</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Kegiatan bulan ini</p>
                      <p className="text-xs text-gray-500">{stats?.recent_activities || 0} kegiatan</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Anak asuh aktif</p>
                      <p className="text-xs text-gray-500">{stats?.active_children || 0} dari {stats?.total_children || 0} anak</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          {/* User Registration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>👤</span>
                <span>Manajemen Pengguna</span>
              </CardTitle>
              <CardDescription>
                Daftarkan pengguna baru ke dalam sistem panti asuhan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <span className="mr-2">➕</span>
                    Daftarkan Pengguna Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Registrasi Pengguna Baru</DialogTitle>
                    <DialogDescription>
                      Lengkapi formulir di bawah untuk mendaftarkan pengguna baru ke dalam sistem.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleUserRegistration} className="space-y-4">
                    {registrationMessage && (
                      <Alert className={registrationMessage.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                        <AlertDescription className={registrationMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                          {registrationMessage.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contoh@email.com"
                        value={userFormData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserFormData((prev: CreateUserInput) => ({ 
                            ...prev, 
                            email: e.target.value 
                          }))
                        }
                        required
                        disabled={isRegistering}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Kata Sandi</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimal 8 karakter"
                        value={userFormData.password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserFormData((prev: CreateUserInput) => ({ 
                            ...prev, 
                            password: e.target.value 
                          }))
                        }
                        minLength={8}
                        required
                        disabled={isRegistering}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Peran Pengguna</Label>
                      <Select
                        value={userFormData.role}
                        onValueChange={(value: 'ADMIN' | 'CHILD' | 'DONOR' | 'STAFF') =>
                          setUserFormData((prev: CreateUserInput) => ({ 
                            ...prev, 
                            role: value 
                          }))
                        }
                        disabled={isRegistering}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih peran pengguna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">
                            <div className="flex items-center space-x-2">
                              <span>🛡️</span>
                              <span>Administrator</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="CHILD">
                            <div className="flex items-center space-x-2">
                              <span>👶</span>
                              <span>Anak Asuh</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="DONOR">
                            <div className="flex items-center space-x-2">
                              <span>💝</span>
                              <span>Donatur</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="STAFF">
                            <div className="flex items-center space-x-2">
                              <span>👥</span>
                              <span>Pengurus Panti</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsRegistrationDialogOpen(false);
                          setRegistrationMessage(null);
                        }}
                        disabled={isRegistering}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isRegistering}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isRegistering ? (
                          <span className="flex items-center space-x-2">
                            <span className="animate-spin">⏳</span>
                            <span>Mendaftarkan...</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-2">
                            <span>✅</span>
                            <span>Daftarkan Pengguna</span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Management Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👶</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Kelola Anak Asuh</h3>
                <p className="text-sm text-gray-600">Manajemen data anak asuh</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💝</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Kelola Donatur</h3>
                <p className="text-sm text-gray-600">Manajemen data donatur</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Kelola Pengurus</h3>
                <p className="text-sm text-gray-600">Manajemen data staf</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎭</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Kelola Kegiatan</h3>
                <p className="text-sm text-gray-600">Manajemen kegiatan panti</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📈 Laporan dan Analisis</CardTitle>
              <CardDescription>
                Unduh dan lihat laporan keuangan serta aktivitas panti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <span className="text-lg mb-1">💰</span>
                  <span>Laporan Keuangan</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <span className="text-lg mb-1">👶</span>
                  <span>Laporan Anak Asuh</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <span className="text-lg mb-1">🎭</span>
                  <span>Laporan Kegiatan</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <span className="text-lg mb-1">📋</span>
                  <span>Laporan Audit</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Pengaturan Sistem</CardTitle>
              <CardDescription>
                Konfigurasi dan pengaturan aplikasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manajemen Pengguna</h4>
                    <p className="text-sm text-gray-600">Kelola akun pengguna dan hak akses</p>
                  </div>
                  <Button variant="outline" size="sm">Kelola</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Backup Data</h4>
                    <p className="text-sm text-gray-600">Cadangkan data sistem secara otomatis</p>
                  </div>
                  <Button variant="outline" size="sm">Konfigurasi</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Log Audit</h4>
                    <p className="text-sm text-gray-600">Lihat riwayat aktivitas sistem</p>
                  </div>
                  <Button variant="outline" size="sm">Lihat Log</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
