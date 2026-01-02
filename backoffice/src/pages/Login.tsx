import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, LogIn } from 'lucide-react';

export default function Login() {
  const [credentials, setCredentials] = useState({ phoneNumber: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="bg-card p-8 rounded-xl shadow-xl w-full max-w-md border border-border">
        {/* Professional Admin Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto relative w-32 h-32 mb-4">
            {/* Animated security pattern background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#235ae4]/30 to-transparent rounded-full opacity-40"></div>
              <div className="absolute w-2 h-2 rounded-full animate-ping" style={{left: '20%', backgroundColor: '#235ae4'}}></div>
              <div className="absolute w-2 h-2 rounded-full animate-pulse" style={{right: '20%', backgroundColor: '#235ae4'}}></div>
            </div>
            
            {/* Main Orderium O Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}>
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
                {/* Large O */}
                <span className="text-5xl font-bold text-white relative z-10">O</span>
              </div>
            </div>
            
            {/* Shield Icon Badge for Admin */}
            <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{borderWidth: '2px', borderColor: '#e0ebff'}}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}>
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Orderium</h1>
          <p className="text-base text-muted-foreground">Admin Backoffice</p>
          <p className="text-sm text-muted-foreground mt-2">Welcome back</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Phone Number</label>
            <input
              type="tel"
              value={credentials.phoneNumber}
              onChange={(e) => {
                setCredentials({ ...credentials, phoneNumber: e.target.value });
                setError('');
              }}
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:border-transparent"
              style={{focusRingColor: '#235ae4'}}
              placeholder="0600000000"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => {
                setCredentials({ ...credentials, password: e.target.value });
                setError('');
              }}
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:border-transparent"
              style={{focusRingColor: '#235ae4'}}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-white py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
            style={{background: 'linear-gradient(to bottom right, #235ae4, #1a47b8)'}}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Login
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
