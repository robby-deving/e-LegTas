import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
import unionBackground from '../assets/Union.png';
import legTasLogo from '../assets/LegTas-Logo.png';

export default function ForgotPassword(){
    usePageTitle('Forgot Password');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Generate random 6-digit OTP
    const generateOTP = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Simple email sending using EmailJS (you can replace with any email service)
    const sendOTPEmail = async (email: string, otp: string) => {
        // For now, we'll just console.log the OTP for testing
        // Replace this with actual email service integration
        console.log(`OTP for ${email}: ${otp}`);
        
        // Example with EmailJS:
        /*
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: 'your_service_id',
                    template_id: 'your_template_id', 
                    user_id: 'your_public_key',
                    template_params: {
                        to_email: email,
                        otp_code: otp,
                        app_name: 'e-LegTas'
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send email');
            }
        } catch (error) {
            throw new Error('Failed to send OTP email');
        }
        */
        
        return true; // Simulate successful email sending for now
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        if (!email) {
            setError("Please enter your email address");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }
        
        try {
            setLoading(true);

            // Check if user exists in users_profile table (lowercase)
            const { data: userProfile, error: userError } = await supabase
                .from('users_profile')  // Changed to lowercase
                .select('user_id, email')
                .eq('email', email)
                .single();

            if (userError || !userProfile) {
                // For security, we'll show success even if user doesn't exist
                setSuccess("If an account with this email exists, a verification code has been sent.");
                setTimeout(() => {
                    navigate('/forgot-password/verify');
                }, 2000);
                return;
            }

            // Generate OTP
            const otp = generateOTP();
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + 10); // OTP expires in 10 minutes

            // Update users_profile with OTP (lowercase)
            const { error: otpError } = await supabase
                .from('users_profile')  // Changed to lowercase
                .update({
                    otp_code: otp,
                    otp_expiration: expiration.toISOString()
                })
                .eq('email', email);

            if (otpError) {
                throw new Error('Failed to generate verification code');
            }

            // Send OTP via email
            await sendOTPEmail(email, otp);

            setSuccess("A verification code has been sent to your email. Please check your inbox.");
            
            // Store email in localStorage for next step
            localStorage.setItem('reset_email', email);
            
            // Navigate to OTP verification page after short delay
            setTimeout(() => {
                navigate('/forgot-password/verify');
            }, 2000);
            
        } catch (error: any) {
            console.error('Reset password error:', error);
            setError(error.message || 'Failed to send verification code');
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