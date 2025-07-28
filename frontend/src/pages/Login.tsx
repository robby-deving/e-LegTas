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
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [employeeNumber, setEmployeeNumber] = useState(''); // Changed from email
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        try {
            setLoading(true);
            
            // Step 1: Find user by employee_number and get email from users_profile
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select(`
                    id,
                    employee_number,
                    users_profile!inner (
                        id,
                        email,
                        role_id,
                        resident_id,
                        residents (
                            first_name,
                            last_name
                        )
                    )
                `)
                .eq('employee_number', employeeNumber)
                .single();

            if (userError || !userData) {
                throw new Error('Invalid employee number');
            }

            // Step 2: Use the email from users_profile to authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: userData.users_profile.email,
                password,
            });

            if (authError) throw authError;
            
            // Step 3: Successfully logged in - Redux dispatch with profile data
            dispatch(setCredentials({
                user: {
                    id: authData.user?.id,
                    email: userData.users_profile.email,
                    employee_number: userData.employee_number,
                    role_id: userData.users_profile.role_id,
                    resident_id: userData.users_profile.resident_id,
                    first_name: userData.users_profile.residents?.first_name,
                    last_name: userData.users_profile.residents?.last_name,
                },
                token: authData.session?.access_token || '',
            }));
            
            console.log('Login successful', authData);
            console.log('User data:', userData);
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
                            <label className='block text-sm font-medium text-gray-700'>Employee Number</label>
                            <input 
                                type='text' 
                                placeholder="Enter your employee number"
                                value={employeeNumber}
                                onChange={(e) => setEmployeeNumber(e.target.value)}
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