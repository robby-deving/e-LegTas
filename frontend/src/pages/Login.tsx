import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux'; // Add this import
import { setCredentials } from '../features/auth/authSlice'; // Add this import
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
import unionBackground from '../assets/Union.png';
import legTasLogo from '../assets/LegTas-Logo.png';

export default function Login(){
    usePageTitle('Login');
    const navigate = useNavigate();
    const dispatch = useDispatch(); // Add this line
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            
            // Successfully logged in - Add this Redux dispatch
            dispatch(setCredentials({
                user: {
                    id: data.user?.id,
                    email: data.user?.email,
                    // You can add more user properties here if needed
                },
                token: data.session?.access_token || '',
            }));
            
            console.log('Login successful', data);
            navigate('/dashboard'); // Redirect to dashboard or home page
        } catch (error: any) {
            console.error('Login error:', error);
            setError(error.error_description || error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address first");
            return;
        }
        
        try {
            setLoading(true);
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            
            if (error) throw error;
            alert("Password reset link sent to your email");
        } catch (error: any) {
            setError(error.error_description || error.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return(
        <div className='flex items-center justify-center h-screen bg-[#1CA567]'>
            <div className='relative mx-auto' style={{ width: '700px', height: '800px' }}>
                <img 
                    src={unionBackground} 
                    alt="Login background" 
                    className='w-full h-full object-contain'
                />
                <div className='absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center p-8 pt-40'>
                    {/* Logo added at the top */}
                    <img 
                        src={legTasLogo}
                        alt="LegTas Logo"
                        className='w-36 h-auto mb-0'
                    />
                    
                    <h1 className='text-[48px] font-black mb-6 text-center'>
                      <span className="text-[#6D6E71]">e-</span>
                      <span className="text-[#2BB673]">Leg</span>
                      <span className="text-[#038B53]">Tas</span>
                    </h1>
                    
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md mb-4 w-96">
                            {error}
                        </div>
                    )}
                    
                    {/* Login form */}
                    <form className='space-y-4 flex flex-col items-center w-full max-w-md' onSubmit={handleLogin}>
                        <div className="w-96 flex flex-col">
                            <label className='block text-sm font-medium text-gray-700'>Email</label>
                            <input 
                                type='email' 
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm'
                                required
                            />
                        </div>
                        <div className="w-96 flex flex-col">
                            <label className='block text-sm font-medium text-gray-700'>Password</label>
                            <input 
                                type='password' 
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm'
                                required
                            />
                            <div className="flex justify-end mt-1">
                                <a 
                                    href="#" 
                                    onClick={handleForgotPassword}
                                    className="text-[14px] text-[#64748B] hover:underline"
                                >
                                    Forgot Password?
                                </a>
                            </div>
                        </div>
                        <button 
                            type='submit'
                            disabled={loading}
                            className='w-96 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0A9359] hover:bg-[#078048] mt-6 disabled:opacity-50'
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}