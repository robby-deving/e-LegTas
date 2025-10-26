import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

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
            const response = await fetch('/api/v1/auth/send-otp', {
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
        <div className='flex items-center justify-center min-h-screen bg-[#1CA567] p-4'>
            {/* Forgot Password Container */}
            <div className='relative w-full h-auto max-w-[min(90vw,700px)] max-h-[95vh] sm:max-w-[min(80vw,650px)] md:max-w-[min(70vw,600px)] lg:max-w-[min(60vw,475px)]'>
                {/* Background Image */}
                <img 
                    src={unionBackground} 
                    alt="Forgot password background" 
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
                            <h2 className='text-base sm:text-lg md:text-2xl font-extrabold text-gray-500 text-center'>
                                Reset Password
                            </h2>
                            <p className='text-xs sm:text-sm text-gray-600 text-center'>
                                Enter your email to reset your password
                            </p>
                        </div>
                        
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-center text-sm">
                                {error}
                            </div>
                        )}
                        
                        {/* Success Message */}
                        {success && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-md text-center text-sm">
                                {success}
                            </div>
                        )}
                        
                        {/* Reset Password Form */}
                        <form className='space-y-2 sm:space-y-4' onSubmit={handleResetPassword}>
                            
                            {/* Email Field */}
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className='block text-xs sm:text-sm font-medium text-gray-800'>
                                    Email
                                </label>
                                <Input 
                                    type='email' 
                                    placeholder="Enter your email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='text-xs sm:text-sm bg-white'
                                    required
                                />
                            </div>
                            
                            {/* Submit Button */}
                            <Button
                                type='submit'
                                disabled={loading}
                                className='w-full py-2 sm:py-2.5 px-4 rounded-md shadow-md text-xs sm:text-sm font-semibold text-white bg-[#0A9359] hover:bg-[#078048] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A9359] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer'
                            >
                                {loading ? 'Sending...' : 'Submit'}
                            </Button>
                            
                        </form>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}