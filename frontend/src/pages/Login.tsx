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

            // Check for 500 server error BEFORE parsing JSON
            if (response.status === 500) {                
                window.location.href = '/error/500';
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                // Handle other errors
                throw new Error(data.message || 'Login failed');
            }

            // Successfully logged in - Redux dispatch with data from server
            dispatch(setCredentials({
                user: data.user,
                token: data.token,
            }));
            navigate('/dashboard');
        } catch (error: any) {
            // Handle network errors or JSON parse errors
            if (error instanceof TypeError) {
                window.location.href = '/error/500';
            } else {
                setError(error.message || 'Failed to login');
            }
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
            <div className='relative w-full h-auto max-w-[600px] sm:max-w-[550px] md:max-w-[530px] lg:max-w-[530px] aspect-[4/5]'>
                {/* Background Image */}
                <img 
                    src={loginContainer} 
                    alt="Login background" 
                    className='w-full h-full object-contain'
                />
                
                {/* Content Overlay */}
                <div className='absolute inset-0 flex items-center justify-center p-[10%] sm:px-[19%] md:px-[19%] sm:pt-[30%] md:pt-[30%]'>
                    <div className="w-full space-y-3 sm:space-y-5 md:space-y-6">
                        
                        {/* Header: Logo & Title */}
                        <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                            <img 
                                src={legTasLogo}
                                alt="LegTas Logo"
                                className='w-14 sm:w-24 md:w-24 lg:w-24 h-auto'
                            />
                            <h1 className='text-xl sm:text-4xl md:text-4xl lg:text-4xl font-black text-center'>
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
                                <label className='block text-xs sm:text-sm md:text-sm font-medium text-gray-800'>
                                    Employee Number
                                </label>
                                <Input 
                                    type='text' 
                                    placeholder="Enter your employee number"
                                    value={employeeNumber}
                                    onChange={(e) => setEmployeeNumber(e.target.value)}
                                    className='text-xs sm:text-sm bg-white'
                                    required
                                />
                            </div>
                            
                            {/* Password Field */}
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className='block text-xs sm:text-sm md:text-sm font-medium text-gray-800'>
                                    Password
                                </label>
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className='text-xs sm:text-sm bg-white'
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