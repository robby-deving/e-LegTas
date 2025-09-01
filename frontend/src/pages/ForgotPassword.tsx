import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

import unionBackground from '../assets/Union.png';
import legTasLogo from '../assets/LegTas-Logo.png';

export default function ForgotPassword(){
    usePageTitle('Forgot Password');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);



    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }
        
        try {
            setLoading(true);

            // Call backend API to send OTP
            const response = await fetch('http://localhost:3000/api/v1/auth/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send verification code');
            }

            setSuccess(data.message);
            
            // Store email for next step
            localStorage.setItem('reset_email', email);
            
            setTimeout(() => {
                navigate('/forgot-password/verify');
            }, 2000);
            
        } catch (error: any) {
            console.error('Reset password error:', error);
            setError(error.message || 'Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return(
        <div className='flex items-center justify-center h-screen bg-[#1CA567]'>
            <div className='relative mx-auto' style={{ width: '700px', height: '800px' }}>
                <img 
                    src={unionBackground} 
                    alt="Forgot password background" 
                    className='w-full h-full object-contain'
                />
                <div className='absolute top-0 left-0 w-full h-full flex flex-col p-8'>
                    {/* Top section with logo and content */}
                    <div className="flex-1 flex flex-col justify-center items-center">
                        {/* Logo */}
                        <img 
                            src={legTasLogo}
                            alt="LegTas Logo"
                            className='w-24 h-auto mb-0'
                        />
                        
                        <h1 className='text-3xl font-black mb-10 text-center'>
                          <span className="text-[#6D6E71]">e-</span>
                          <span className="text-[#2BB673]">Leg</span>
                          <span className="text-[#038B53]">Tas</span>
                        </h1>
                        
                        <h2 className='text-3xl font-extrabold mb-2 text-center text-gray-500'>
                            Reset Password
                        </h2>

                        <p className='text-base text-center text-gray-600 mb-10'>
                            Enter your email to reset your password
                        </p>
                        
                        {/* Error message */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md mb-4 w-96 text-sm">
                                {error}
                            </div>
                        )}
                        
                        {/* Success message */}
                        {success && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md mb-4 w-96 text-sm">
                                {success}
                            </div>
                        )}
                        
                        {/* Email input */}
                        <div className="w-96 flex flex-col">
                            <label className='block text-sm font-medium text-gray-700'>Email</label>
                            <input 
                                type='email' 
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-[#0A9359] focus:outline-none'
                                required
                            />
                        </div>
                    </div>
                    
                    {/* Submit button at bottom */}
                    <div className="flex justify-center">
                        <button 
                            type='submit'
                            onClick={handleResetPassword}
                            disabled={loading}
                            className='w-96 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#0A9359] hover:bg-[#078048] disabled:opacity-50'
                        >
                            {loading ? 'Sending...' : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}