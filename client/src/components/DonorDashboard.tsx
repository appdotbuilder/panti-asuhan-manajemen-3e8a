
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Donor, Donation, CreateDonationInput, Child } from '../../../server/src/schema';

interface DonorDashboardProps {
  user: User;
}

export function DonorDashboard({ user }: DonorDashboardProps) {
  const [donorData, setDonorData] = useState<Donor | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [donationForm, setDonationForm] = useState<CreateDonationInput>({
    donor_id: 0,
    donation_type: 'MONEY',
    amount: null,
    description: '',
    donation_date: new Date()
  });

  const loadDonorData = useCallback(async () => {
    try {
      setIsLoading(true);
      const donor = await trpc.getDonorByUserId.query({ userId: user.id });
      setDonorData(donor);
      
      if (donor) {
        const donationData = await trpc.getDonationsByDonorId.query({ 
          donorId: donor.id 
        });
        setDonations(donationData);
      }

      // Load children data for donor to see
      const childrenData = await trpc.getAllChildren.query();
      setChildren(childrenData);
    } catch (error) {
      console.error('Failed to load donor data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDonorData();
  }, [loadDonorData]);

  useEffect(() => {
    if (donorData) {
      setDonationForm(prev => ({ ...prev, donor_id: donorData.id }));
    }
  }, [donorData]);

  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorData) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const newDonation = await trpc.createDonation.mutate(donationForm);
      setDonations((prev: Donation[]) => [newDonation, ...prev]);
      
      // Reset form
      setDonationForm({
        donor_id: donorData.id,
        donation_type: 'MONEY',
        amount: null,
        description: '',
        donation_date: new Date()
      });
      
      setSuccess('Donasi berhasil dicatat! Terima kasih atas kebaikan Anda.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mencatat donasi. Silakan coba lagi.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDonationTypeLabel = (type: string) => {
    switch (type) {
      case 'MONEY':
        return 'Uang';
      case 'GOODS':
        return 'Barang';
      case 'SERVICE':
        return 'Jasa';
      default:
        return type;
    }
  };

  const totalDonations = donations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
  const donationsThisMonth = donations.filter(donation => {
    const donationDate = new Date(donation.donation_date);
    const now = new Date();
    return donationDate.getMonth() === now.getMonth() && 
           donationDate.getFullYear() === now.getFullYear();
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!donorData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Data Donatur Tidak Ditemukan
        </h3>
        <p className="text-gray-600 mb-4">
          Profil donatur belum dibuat untuk akun Anda.
        </p>
        <Button onClick={loadDonorData} variant="outline">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Donatur</h2>
          <p className="text-gray-600 mt-1">Selamat datang, {donorData.full_name} 💝</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              💝 Buat Donasi Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Donasi Baru</DialogTitle>
              <DialogDescription>
                Catat donasi yang Anda berikan untuk panti asuhan
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitDonation} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Donasi</label>
                <Select 
                  value={donationForm.donation_type || 'MONEY'}
                  onValueChange={(value: 'MONEY' | 'GOODS' | 'SERVICE') =>
                    setDonationForm((prev: CreateDonationInput) => ({ ...prev, donation_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONEY">💰 Uang</SelectItem>
                    <SelectItem value="GOODS">📦 Barang</SelectItem>
                    <SelectItem value="SERVICE">🛠️ Jasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {donationForm.donation_type === 'MONEY' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Jumlah Donasi</label>
                  <Input
                    type="number"
                    placeholder="Masukkan jumlah dalam Rupiah"
                    value={donationForm.amount || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDonationForm((prev: CreateDonationInput) => ({ 
                        ...prev, 
                        amount: e.target.value ? parseFloat(e.target.value) : null 
                      }))
                    }
                    min="0"
                    step="1000"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi</label>
                <Textarea
                  placeholder="Jelaskan detail donasi Anda..."
                  value={donationForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDonationForm((prev: CreateDonationInput) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Donasi</label>
                <Input
                  type="date"
                  value={donationForm.donation_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDonationForm((prev: CreateDonationInput) => ({ 
                      ...prev, 
                      donation_date: new Date(e.target.value) 
                    }))
                  }
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Donasi'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Total Donasi
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {donations.length}
                </p>
                <p className="text-sm text-gray-500">
                  Donasi tercatat
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-2xl">
                📊
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Nilai Donasi Uang
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  Rp {totalDonations.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500">
                  Total kontribusi
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white text-2xl">
                💰
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Donasi Bulan Ini
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {donationsThisMonth.length}
                </p>
                <p className="text-sm text-gray-500">
                  Donasi terbaru
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-2xl">
                📅
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="donations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="donations">Riwayat Donasi</TabsTrigger>
          <TabsTrigger value="children">Anak Asuh</TabsTrigger>
          <TabsTrigger value="profile">Profil Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📋 Riwayat Donasi Anda</CardTitle>
              <CardDescription>
                Daftar semua donasi yang telah Anda berikan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💝</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Belum Ada Donasi
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Mulai berdonasi untuk membantu anak-anak di panti asuhan
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {donations.map((donation: Donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className="bg-blue-100 text-blue-800">
                            {getDonationTypeLabel(donation.donation_type)}
                          </Badge>
                          {donation.amount && (
                            <span className="text-lg font-semibold text-green-600">
                              Rp {donation.amount.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-1">
                          {donation.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(donation.donation_date).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="children" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👶 Anak-anak Panti Asuhan</CardTitle>
              <CardDescription>
                Lihat profil anak-anak yang dapat Anda bantu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child: Child) => (
                  <Card key={child.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">👶</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {child.full_name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {child.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Bergabung: {new Date(child.admission_date).toLocaleDateString('id-ID')}
                        </p>
                        {child.education_level && (
                          <Badge variant="outline" className="mt-2">
                            {child.education_level}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👤 Profil Donatur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Nama Lengkap:</span>
                <span className="text-sm text-gray-900">{donorData.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <span className="text-sm text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Telepon:</span>
                <span className="text-sm text-gray-900">{donorData.phone || 'Belum diatur'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Alamat:</span>
                <span className="text-sm text-gray-900">{donorData.address || 'Belum diatur'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Organisasi:</span>
                <span className="text-sm text-gray-900">{donorData.organization || 'Individu'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Bergabung:</span>
                <span className="text-sm text-gray-900">
                  {new Date(donorData.created_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
