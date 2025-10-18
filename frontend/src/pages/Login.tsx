import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../features/auth/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import loginContainer from '../assets/loginContainer.svg';
import legTasLogo from '../assets/LegTas-Logo.png';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function Login(){
    usePageTitle('Login');
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        try {
            setLoading(true);
            
            // Call server API for login
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Allow cookies to be set by backend
                body: JSON.stringify({
                    employeeNumber,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Successfully logged in - Redux dispatch with data from server
            // After login, fetch full profile to ensure resident names are available
            try {
                const profileRes = await fetch(`/api/v1/profile/${data.user.user_id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.token}`
                    }
                });
                const profileJson = await profileRes.json();
                const profileData = profileJson?.data || null;

                const mergedUser = {
                    ...data.user,
                    first_name: profileData?.first_name ?? data.user.first_name ?? null,
                    last_name: profileData?.last_name ?? data.user.last_name ?? null,
                    email: profileData?.email ?? data.user.email ?? null,
                };

                dispatch(setCredentials({
                    user: mergedUser,
                    token: data.token,
                }));
            } catch (e) {
                // If profile fetch fails, still dispatch what we have
                console.warn('Failed to fetch profile after login, using login payload', e);
                dispatch(setCredentials({ user: data.user, token: data.token }));
            }
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            setError(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/forgot-password');
    };

    return (
        <div className='flex items-center justify-center min-h-screen bg-[#1CA567] p-4'>
            {/* Login Container */}
            <div className='relative w-full h-auto max-w-[min(90vw,700px)] max-h-[95vh] sm:max-w-[min(80vw,650px)] md:max-w-[min(70vw,600px)] lg:max-w-[min(60vw,475px)]'>
                {/* Background Image */}
                <img 
                    src={loginContainer} 
                    alt="Login background" 
                    className='w-full h-full max-h-[95vh] object-contain'
                />
                
                {/* Content Overlay */}
                <div className='absolute inset-14 flex items-center justify-center px-6 mt-18'>
                    <div className="w-full max-w-md space-y-5 sm:space-y-6">
                        
                        {/* Header: Logo & Title */}
                        <div className="flex flex-col items-center space-y-2 sm:space-y-3 py-4">
                            <img 
                                src={legTasLogo}
                                alt="LegTas Logo"
                                className='w-12 sm:w-14 md:w-16 lg:w-22 h-auto'
                            />
                            <h1 className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-center'>
                                <span className="text-[#6D6E71]">e-</span>
                                <span className="text-[#2BB673]">Leg</span>
                                <span className="text-[#038B53]">Tas</span>
                            </h1>
                        </div>
                        
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-center text-sm">
                                {error}
                            </div>
                        )}
                        
                        {/* Login Form */}
                        <form className='space-y-2 sm:space-y-4' onSubmit={handleLogin}>
                            
                            {/* Employee Number Field */}
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className='block text-xs sm:text-sm font-medium text-gray-800'>
                                    Employee Number
                                </label>
                                <Input 
                                    type='text' 
                                    placeholder="Employee Number"
                                    value={employeeNumber}
                                    onChange={(e) => setEmployeeNumber(e.target.value)}
                                    className='text-xs sm:text-sm bg-white'
                                    required
                                />
                            </div>
                            
                            {/* Password Field */}
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className='block text-xs sm:text-sm font-medium text-gray-800'>
                                    Password
                                </label>
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className='pr-10 text-xs sm:text-sm bg-white'
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4 sm:w-4 sm:h-4 cursor-pointer" />
                                        ) : (
                                            <Eye className="w-4 h-4 sm:w-4 sm:h-4 cursor-pointer" />
                                        )}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-1">
                                    <a 
                                        href="#" 
                                        onClick={handleForgotPassword}
                                        className="text-xs pt-2 sm:text-sm text-[#64748B] hover:text-[#0A9359] hover:underline transition-colors"
                                    >
                                        Forgot Password?
                                    </a>
                                </div>
                            </div>
                            
                            {/* Submit Button */}
                            <Button
                                type='submit'
                                disabled={loading}
                                className='w-full py-2 sm:py-2.5 px-4 rounded-md shadow-md text-xs sm:text-sm font-semibold text-white bg-[#0A9359] hover:bg-[#078048] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A9359] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer'
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </Button>
                            
                        </form>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}