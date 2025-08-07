
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { User, Child, ActivityParticipation } from '../../../server/src/schema';

interface ChildDashboardProps {
  user: User;
}

export function ChildDashboard({ user }: ChildDashboardProps) {
  const [childData, setChildData] = useState<Child | null>(null);
  const [participations, setParticipations] = useState<ActivityParticipation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadChildData = useCallback(async () => {
    try {
      setIsLoading(true);
      const child = await trpc.getChildByUserId.query({ userId: user.id });
      setChildData(child);
      
      if (child) {
        const participationData = await trpc.getParticipationsByChildId.query({ 
          childId: child.id 
        });
        setParticipations(participationData);
      }
    } catch (error) {
      console.error('Failed to load child data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadChildData();
  }, [loadChildData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return <Badge className="bg-blue-100 text-blue-800">Terdaftar</Badge>;
      case 'ATTENDED':
        return <Badge className="bg-green-100 text-green-800">Hadir</Badge>;
      case 'ABSENT':
        return <Badge className="bg-red-100 text-red-800">Tidak Hadir</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Dibatalkan</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!childData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Data Anak Tidak Ditemukan
        </h3>
        <p className="text-gray-600 mb-4">
          Profil anak asuh belum dibuat untuk akun Anda.
        </p>
        <Button onClick={loadChildData} variant="outline">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
        <Avatar className="w-20 h-20">
          <AvatarImage src={childData.photo_url ||undefined} />
          <AvatarFallback className="bg-purple-100 text-purple-700 text-xl">
            {getInitials(childData.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Halo, {childData.full_name}! 👋
          </h2>
          <p className="text-gray-600 mb-2">
            {calculateAge(childData.date_of_birth)} tahun • {childData.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
          </p>
          <p className="text-sm text-gray-500">
            Bergabung sejak {new Date(childData.admission_date).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>👤</span>
              <span>Informasi Profil</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Nama Lengkap:</span>
              <span className="text-sm text-gray-900">{childData.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Tanggal Lahir:</span>
              <span className="text-sm text-gray-900">
                {new Date(childData.date_of_birth).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Jenis Kelamin:</span>
              <span className="text-sm text-gray-900">
                {childData.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Tingkat Pendidikan:</span>
              <span className="text-sm text-gray-900">
                {childData.education_level || 'Belum diatur'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Status Kesehatan:</span>
              <span className="text-sm text-gray-900">
                {childData.health_status || 'Baik'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🎭</span>
              <span>Kegiatan Saya</span>
            </CardTitle>
            <CardDescription>
              Partisipasi dalam kegiatan panti asuhan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participations.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">🎭</span>
                </div>
                <p className="text-sm text-gray-500">Belum ada kegiatan yang diikuti</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {participations.slice(0, 5).map((participation: ActivityParticipation) => (
                  <div key={participation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Kegiatan #{participation.activity_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Terdaftar: {new Date(participation.registered_at).toLocaleDateString('id-ID')}
                      </p>
                      {participation.notes && (
                        <p className="text-xs text-gray-600 mt-1">
                          {participation.notes}
                        </p>
                      )}
                    </div>
                    <div className="ml-3">
                      {getStatusBadge(participation.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Story Section */}
      {childData.background_story && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📖</span>
              <span>Cerita Saya</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {childData.background_story}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⚡</span>
            <span>Menu Cepat</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <span className="text-lg">📋</span>
              <span className="text-sm">Lihat Jadwal</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-1">
              <span className="text-lg">🎯</span>
              <span className="text-sm">Pencapaian</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
