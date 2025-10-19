import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import unionBackground from '../assets/Union.png';
import legTasLogo from '../assets/LegTas-Logo.png';

export default function ForgotPassword1(){
    usePageTitle('Verify OTP');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Get email from localStorage
        const storedEmail = localStorage.getItem('reset_email');
        if (!storedEmail) {
            setError('No email found. Please restart the password reset process.');
            setTimeout(() => navigate('/forgot-password'), 3000);
        } else {
            setEmail(storedEmail);
        }
    }, [navigate]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return; // Only allow single digit
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        // Handle backspace to move to previous input
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError("Please enter all 6 digits");
            return;
        }
        
        try {
            setLoading(true);
            
            // Verify OTP from users_profile table (lowercase)
            const { data: userProfile, error: otpError } = await supabase
                .from('users_profile')  // Changed to lowercase
                .select('user_id, otp_code, otp_expiration')
                .eq('email', email)
                .single();

            if (otpError || !userProfile) {
                setError("Invalid verification code");
                return;
            }

            // Check if OTP matches
            if (userProfile.otp_code !== otpCode) {
                setError("Invalid verification code");
                return;
            }

            // Check if OTP is expired
            const now = new Date();
            const expirationTime = new Date(userProfile.otp_expiration);
            
            if (now > expirationTime) {
                setError("Verification code has expired. Please request a new one.");
                return;
            }

            // Clear OTP after successful verification (optional security measure)
            const { error: clearOtpError } = await supabase
                .from('users_profile')  // Changed to lowercase
                .update({ 
                    otp_code: null, 
                    otp_expiration: null 
                })
                .eq('email', email);

            if (clearOtpError) {
                console.error('Error clearing OTP:', clearOtpError);
            }

            setSuccess("OTP verified successfully! Redirecting...");
            
            // Store verification token for password reset
            localStorage.setItem('otp_verified', 'true');
            localStorage.setItem('otp_timestamp', Date.now().toString());
            localStorage.setItem('verified_user_id', userProfile.user_id);
            
            // Navigate to password reset page
            setTimeout(() => {
                navigate('/forgot-password/reset');
            }, 1500);
            
        } catch (error: any) {
            console.error('OTP verification error:', error);
            setError('Failed to verify OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Call backend API to resend OTP
            const response = await fetch('/api/v1/auth/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend verification code');
            }

            setSuccess("New verification code sent to your email.");
            
        } catch (error: any) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return(
        <div className='flex items-center justify-center min-h-screen bg-[#1CA567] p-4'>
            {/* Verify OTP Container */}
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
                                Verification
                            </h2>
                            <p className='text-xs sm:text-sm text-gray-600 text-center'>
                                We sent a 6-digit code to {email ? email.substring(0, 3) + '***@' + email.split('@')[1] : 'your email'}
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
                        
                        {/* OTP Verification Form */}
                        <form className='space-y-2 sm:space-y-6' onSubmit={handleVerifyOtp}>
                            
                            {/* OTP Input Boxes */}
                            <div className="flex justify-center gap-2 sm:gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => {
                                            inputRefs.current[index] = el;
                                        }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        placeholder="0"
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-10 h-10 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#0A9359] focus:outline-none placeholder-gray-400 bg-white"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                    />
                                ))}
                            </div>

                            {/* Resend Code */}
                            <p className='text-xs sm:text-sm text-center text-gray-600'>
                                Didn't receive a code? 
                                <button 
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={loading}
                                    className='text-[#0A9359] font-bold ml-1 hover:text-[#078048] disabled:opacity-50 cursor-pointer'
                                >
                                    Resend Code
                                </button>
                            </p>
                            
                            {/* Submit Button */}
                            <Button
                                type='submit'
                                disabled={loading}
                                className='w-full py-2 sm:py-2.5 px-4 rounded-md shadow-md text-xs sm:text-sm font-semibold text-white bg-[#0A9359] hover:bg-[#078048] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A9359] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer'
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </Button>
                            
                        </form>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}