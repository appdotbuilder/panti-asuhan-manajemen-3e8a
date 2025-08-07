import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';

export function CreateAdminUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCreateAdmin = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const adminUser = await trpc.createAdminUser.mutate({
        email: 'airamito11@gmail.com',
        password: '123456'
      });

      setResult(`✅ Admin user created successfully!
ID: ${adminUser.id}
Email: ${adminUser.email}
Role: ${adminUser.role}
Active: ${adminUser.is_active}
Created: ${adminUser.created_at.toLocaleString()}`);

      console.log('Admin user created:', adminUser);
    } catch (error) {
      console.error('Failed to create admin user:', error);
      setResult(`❌ Failed to create admin user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">🔐 Create Admin User</h2>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Email:</strong> airamito11@gmail.com
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Password:</strong> 123456
        </p>
        <p className="text-sm text-gray-600">
          <strong>Role:</strong> ADMIN
        </p>
      </div>

      <Button 
        onClick={handleCreateAdmin}
        disabled={isLoading}
        className="w-full mb-4"
      >
        {isLoading ? 'Creating Admin...' : 'Create Admin User'}
      </Button>

      {result && (
        <div className={`p-4 rounded-lg text-sm whitespace-pre-line ${
          result.startsWith('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}