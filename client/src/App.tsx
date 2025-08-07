
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput } from '../../server/src/schema';
import { AdminDashboard } from './components/AdminDashboard';
import { ChildDashboard } from './components/ChildDashboard';
import { DonorDashboard } from './components/DonorDashboard';
import { StaffDashboard } from './components/StaffDashboard';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.login.mutate(loginData);
      setAuthState({
        isAuthenticated: true,
        user: result.user
      });
      // Store user info in localStorage for persistence
      localStorage.setItem('userId', result.user.id.toString());
      setLoginData({ email: '', password: '' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login gagal. Silakan periksa email dan password Anda.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authState.user) {
        await trpc.logout.mutate({ userId: authState.user.id });
      }
      setAuthState({ isAuthenticated: false, user: null });
      localStorage.removeItem('userId');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const checkAuthStatus = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      try {
        const user = await trpc.getCurrentUser.query({ userId: parseInt(userId) });
        setAuthState({ isAuthenticated: true, user });
      } catch (error) {
        localStorage.removeItem('userId');
        console.error('Auth check failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'STAFF':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'DONOR':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'CHILD':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'STAFF':
        return 'Pengurus';
      case 'DONOR':
        return 'Donatur';
      case 'CHILD':
        return 'Anak Asuh';
      default:
        return role;
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏠</span>
            </div>
            <CardTitle className="text-2xl font-bold text-indigo-900">
              Sistem Manajemen Panti Asuhan
            </CardTitle>
            <CardDescription className="text-gray-600">
              Silakan masuk dengan akun Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={loginData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                  }
                  className="h-11"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input
                  type="password"
                  placeholder="Masukkan password"
                  value={loginData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                  }
                  className="h-11"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderDashboard = () => {
    if (!authState.user) return null;

    switch (authState.user.role) {
      case 'ADMIN':
        return <AdminDashboard user={authState.user} />;
      case 'CHILD':
        return <ChildDashboard user={authState.user} />;
      case 'DONOR':
        return <DonorDashboard user={authState.user} />;
      case 'STAFF':
        return <StaffDashboard user={authState.user} />;
      default:
        return (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-700">
              Peran pengguna tidak dikenali
            </h2>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">🏠</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Panti Asuhan Harapan
                </h1>
                <p className="text-xs text-gray-500">Sistem Manajemen</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {authState.user?.email}
                </p>
                <div className="flex items-center justify-end space-x-2">
                  <Badge className={`text-xs ${getRoleBadgeColor(authState.user?.role || '')}`}>
                    {getRoleDisplayName(authState.user?.role || '')}
                  </Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </main>
    </div>
  );
}

export default App;
