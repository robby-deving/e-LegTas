import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
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
            
            // Generate new OTP
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + 10);

            // Update users_profile with new OTP (lowercase)
            const { error: otpError } = await supabase
                .from('users_profile')  // Changed to lowercase
                .update({
                    otp_code: newOtp,
                    otp_expiration: expiration.toISOString()
                })
                .eq('email', email);

            if (otpError) {
                throw new Error('Failed to generate new OTP');
            }

            // Here you would send the new OTP via email
            console.log(`New OTP for ${email}: ${newOtp}`);
            
            setSuccess("New verification code sent to your email.");
            
        } catch (error: any) {
            setError('Failed to resend code. Please try again.');
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
                <div className='absolute top-0 left-0 w-full h-full flex flex-col p-8 mt-4'>
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
                            Verification
                        </h2>

                        <p className='text-base text-center text-gray-600 mb-10'>
                            We sent a 6-digit code to {email ? email.substring(0, 3) + '***@' + email.split('@')[1] : 'your email'}
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
                        
                        {/* OTP Input Boxes */}
                        <div className="flex justify-center gap-3 mb-6">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    placeholder="0"
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#0A9359] focus:outline-none placeholder-gray-400"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                />
                            ))}
                        </div>

                        {/* Resend Code */}
                        <p className='text-sm text-center text-gray-600 mb-0'>
                            Didn't receive a code? 
                            <button 
                                onClick={handleResendCode}
                                disabled={loading}
                                className='text-[#0A9359] font-bold ml-1 hover:text-[#078048] disabled:opacity-50'
                            >
                                Resend Code
                            </button>
                        </p>
                    </div>
                    
                    {/* Submit button at bottom */}
                    <div className="flex justify-center">
                        <button 
                            type='submit'
                            onClick={handleVerifyOtp}
                            disabled={loading}
                            className='w-96 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#0A9359] hover:bg-[#078048] disabled:opacity-50 mb-4'
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}