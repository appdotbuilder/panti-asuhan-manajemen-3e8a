
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { User, Staff, Child, Activity, Expense, CreateExpenseInput, CreateActivityInput } from '../../../server/src/schema';

interface StaffDashboardProps {
  user: User;
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [staffData, setStaffData] = useState<Staff | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expenseForm, setExpenseForm] = useState<CreateExpenseInput>({
    staff_id: 0,
    expense_type: 'FOOD',
    amount: 0,
    description: '',
    expense_date: new Date(),
    receipt_url: null
  });

  const [activityForm, setActivityForm] = useState<CreateActivityInput>({
    title: '',
    description: null,
    activity_date: new Date(),
    location: null,
    max_participants: null,
    created_by: 0
  });

  const loadStaffData = useCallback(async () => {
    try {
      setIsLoading(true);
      const staff = await trpc.getStaffByUserId.query({ userId: user.id });
      setStaffData(staff);
      
      if (staff) {
        const expenseData = await trpc.getExpensesByStaffId.query({ 
          staffId: staff.id 
        });
        setExpenses(expenseData);
      }

      // Load children and activities data
      const childrenData = await trpc.getAllChildren.query();
      const activitiesData = await trpc.getAllActivities.query();
      setChildren(childrenData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load staff data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  useEffect(() => {
    if (staffData) {
      setExpenseForm(prev => ({ ...prev, staff_id: staffData.id }));
      setActivityForm(prev => ({ ...prev, created_by: staffData.user_id }));
    }
  }, [staffData]);

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const newExpense = await trpc.createExpense.mutate(expenseForm);
      setExpenses((prev: Expense[]) => [newExpense, ...prev]);
      
      // Reset form
      setExpenseForm({
        staff_id: staffData.id,
        expense_type: 'FOOD',
        amount: 0,
        description: '',
        expense_date: new Date(),
        receipt_url: null
      });
      
      setSuccess('Pengeluaran berhasil dicatat!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mencatat pengeluaran. Silakan coba lagi.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const newActivity = await trpc.createActivity.mutate(activityForm);
      setActivities((prev: Activity[]) => [newActivity, ...prev]);
      
      // Reset form
      setActivityForm({
        title: '',
        description: null,
        activity_date: new Date(),
        location: null,
        max_participants: null,
        created_by: staffData.user_id
      });
      
      setSuccess('Kegiatan berhasil dibuat!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal membuat kegiatan. Silakan coba lagi.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExpenseTypeLabel = (type: string) => {
    switch (type) {
      case 'FOOD':
        return 'Makanan';
      case 'EDUCATION':
        return 'Pendidikan';
      case 'HEALTHCARE':
        return 'Kesehatan';
      case 'UTILITIES':
        return 'Utilitas';
      case 'MAINTENANCE':
        return 'Pemeliharaan';
      case 'OTHER':
        return 'Lainnya';
      default:
        return type;
    }
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800';
      case 'ONGOING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesThisMonth = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && 
           expenseDate.getFullYear() === now.getFullYear();
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
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

  if (!staffData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Data Staf Tidak Ditemukan
        </h3>
        <p className="text-gray-600 mb-4">
          Profil staf belum dibuat untuk akun Anda.
        </p>
        <Button onClick={loadStaffData} variant="outline">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={staffData.photo_url || undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {getInitials(staffData.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Pengurus</h2>
            <p className="text-gray-600 mt-1">
              {staffData.full_name} • {staffData.position}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                📝 Catat Pengeluaran
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Catat Pengeluaran Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan pengeluaran untuk operasional panti
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmitExpense} className="space-y-4">
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
                  <label className="text-sm font-medium">Jenis Pengeluaran</label>
                  <Select 
                    value={expenseForm.expense_type || 'FOOD'}
                    onValueChange={(value: 'FOOD' | 'EDUCATION' | 'HEALTHCARE' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER') =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ ...prev, expense_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOOD">🍽️ Makanan</SelectItem>
                      <SelectItem value="EDUCATION">📚 Pendidikan</SelectItem>
                      <SelectItem value="HEALTHCARE">🏥 Kesehatan</SelectItem>
                      <SelectItem value="UTILITIES">💡 Utilitas</SelectItem>
                      <SelectItem value="MAINTENANCE">🔧 Pemeliharaan</SelectItem>
                      <SelectItem value="OTHER">📋 Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Jumlah</label>
                  <Input
                    type="number"
                    placeholder="Masukkan jumlah dalam Rupiah"
                    value={expenseForm.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ 
                        ...prev, 
                        amount: parseFloat(e.target.value) || 0 
                      }))
                    }
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Deskripsi</label>
                  <Textarea
                    placeholder="Jelaskan detail pengeluaran..."
                    value={expenseForm.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ ...prev, description: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal</label>
                  <Input
                    type="date"
                    value={expenseForm.expense_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExpenseForm((prev: CreateExpenseInput) => ({ 
                        ...prev, 
                        expense_date: new Date(e.target.value) 
                      }))
                    }
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                🎭 Buat Kegiatan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Kegiatan Baru</DialogTitle>
                <DialogDescription>
                  Rencanakan kegiatan untuk anak-anak panti
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmitActivity} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Judul Kegiatan</label>
                  <Input
                    placeholder="Masukkan judul kegiatan"
                    value={activityForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Deskripsi</label>
                  <Textarea
                    placeholder="Jelaskan detail kegiatan..."
                    value={activityForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Kegiatan</label>
                  <Input
                    type="datetime-local"
                    value={activityForm.activity_date.toISOString().slice(0, 16)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        activity_date: new Date(e.target.value) 
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Lokasi</label>
                  <Input
                    placeholder="Lokasi kegiatan"
                    value={activityForm.location || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        location: e.target.value || null 
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Maksimal Peserta</label>
                  <Input
                    type="number"
                    placeholder="Jumlah maksimal peserta"
                    value={activityForm.max_participants || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        max_participants: e.target.value ? parseInt(e.target.value) : null 
                      }))
                    }
                    min="1"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Membuat...' : 'Buat Kegiatan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Total Anak Asuh
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {children.length}
                </p>
                <p className="text-sm text-gray-500">
                  Anak terdaftar
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-2xl">
                👶
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Total Kegiatan
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activities.length}
                </p>
                <p className="text-sm text-gray-500">
                  Kegiatan terdaftar
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-2xl">
                🎭
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Pengeluaran Saya
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  Rp {totalExpenses.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500">
                  Total pengeluaran
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl">
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
                  Bulan Ini
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {expensesThisMonth.length}
                </p>
                <p className="text-sm text-gray-500">
                  Pengeluaran baru
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white text-2xl">
                📅
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="children" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="children">Kelola Anak</TabsTrigger>
          <TabsTrigger value="activities">Kegiatan</TabsTrigger>
          <TabsTrigger value="expenses">Pengeluaran</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👶 Manajemen Anak Asuh</CardTitle>
              <CardDescription>
                Kelola data dan informasi anak-anak panti asuhan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child: Child) => (
                  <Card key={child.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">👶</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {child.full_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {child.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {child.education_level || 'Pendidikan belum diatur'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🎭 Kegiatan Panti</CardTitle>
              <CardDescription>
                Daftar dan kelola kegiatan anak-anak
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity: Activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                        <Badge className={getActivityStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mb-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>📅 {new Date(activity.activity_date).toLocaleDateString('id-ID')}</span>
                        {activity.location && (
                          <span>📍 {activity.location}</span>
                        )}
                        {activity.max_participants && (
                          <span>👥 Max {activity.max_participants} peserta</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        Peserta
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💰 Pengeluaran Saya</CardTitle>
              <CardDescription>
                Riwayat pengeluaran yang telah dicatat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenses.map((expense: Expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className="bg-blue-100 text-blue-800">
                          {getExpenseTypeLabel(expense.expense_type)}
                        </Badge>
                        <span className="text-lg font-semibold text-red-600">
                          Rp {expense.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(expense.expense_date).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {expense.receipt_url && (
                      <Button size="sm" variant="outline">
                        📋 Bukti
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👤 Profil Staf</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={staffData.photo_url || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
                    {getInitials(staffData.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{staffData.full_name}</h3>
                  <p className="text-gray-600">{staffData.position}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Nama Lengkap:</span>
                  <span className="text-sm text-gray-900">{staffData.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Posisi:</span>
                  <span className="text-sm text-gray-900">{staffData.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Telepon:</span>
                  <span className="text-sm text-gray-900">{staffData.phone || 'Belum diatur'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Alamat:</span>
                  <span className="text-sm text-gray-900">{staffData.address || 'Belum diatur'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Tanggal Bergabung:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(staffData.hire_date).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
