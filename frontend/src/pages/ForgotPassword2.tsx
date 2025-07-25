import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
import unionBackground from '../assets/Union.png';
import legTasLogo from '../assets/LegTas-Logo.png';

export default function ForgotPassword2(){
    usePageTitle('Create New Password');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [userId, setUserId] = useState('');

    useEffect(() => {
        // Verify that user came from OTP verification
        const otpVerified = localStorage.getItem('otp_verified');
        const otpTimestamp = localStorage.getItem('otp_timestamp');
        const verifiedUserId = localStorage.getItem('verified_user_id');
        
        if (!otpVerified || !otpTimestamp || !verifiedUserId) {
            setError("Unauthorized access. Please restart the password reset process.");
            setTimeout(() => navigate('/forgot-password'), 3000);
            return;
        }

        // Check if verification is still valid (10 minutes)
        const now = Date.now();
        const verificationTime = parseInt(otpTimestamp);
        const timeDiff = now - verificationTime;
        const tenMinutes = 10 * 60 * 1000;

        if (timeDiff > tenMinutes) {
            setError("Verification expired. Please restart the password reset process.");
            localStorage.removeItem('otp_verified');
            localStorage.removeItem('otp_timestamp');
            localStorage.removeItem('reset_email');
            localStorage.removeItem('verified_user_id');
            setTimeout(() => navigate('/forgot-password'), 3000);
            return;
        }

        setUserId(verifiedUserId);
    }, [navigate]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        if (!password || !confirmPassword) {
            setError("Please fill in both password fields");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }
        
        try {
            setLoading(true);
            
            // Make sure this matches your server port (3000)
            const response = await fetch('http://localhost:3000/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    newPassword: password
                })
            });

            // Check if response is ok before trying to parse JSON
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Server error: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('Reset password response:', responseData);

            setSuccess("Password updated successfully! Redirecting to login...");
            
            // Clean up localStorage
            localStorage.removeItem('otp_verified');
            localStorage.removeItem('otp_timestamp');
            localStorage.removeItem('reset_email');
            localStorage.removeItem('verified_user_id');
            
            // Redirect to login page
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            
        } catch (error: any) {
            console.error('Password update error:', error);
            setError(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return(
        <div className='flex items-center justify-center h-screen bg-[#1CA567]'>
            <div className='relative mx-auto' style={{ width: '700px', height: '800px' }}>
                <img 
                    src={unionBackground} 
                    alt="Create new password background" 
                    className='w-full h-full object-contain'
                />
                <div className='absolute top-0 left-0 w-full h-full flex flex-col p-8'>
                    {/* Top section with logo and content */}
                    <div className="flex-1 flex flex-col justify-center items-center -mt-8">
                        {/* Logo */}
                        <img 
                            src={legTasLogo}
                            alt="LegTas Logo"
                            className='w-24 h-auto mb-0'
                        />
                        
                        <h1 className='text-3xl font-black mb-6 text-center'>
                          <span className="text-[#6D6E71]">e-</span>
                          <span className="text-[#2BB673]">Leg</span>
                          <span className="text-[#038B53]">Tas</span>
                        </h1>
                        
                        <h2 className='text-2xl font-extrabold mb-2 text-center text-gray-500'>
                            Create New Password
                        </h2>

                        <p className='text-base text-center text-gray-600 mb-8'>
                            Your new password must be different from<br />your previous password.
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
                        
                        {/* Password Input Fields */}
                        <div className="w-96 flex flex-col space-y-4">
                            <div className="flex flex-col">
                                <label className='block text-sm font-medium text-gray-700 mb-1'>New Password</label>
                                <input 
                                    type='password' 
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-[#0A9359] focus:outline-none'
                                    required
                                />
                            </div>
                            
                            <div className="flex flex-col">
                                <label className='block text-sm font-medium text-gray-700 mb-1'>Confirm Password</label>
                                <input 
                                    type='password' 
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-[#0A9359] focus:outline-none'
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Submit button at bottom */}
                    <div className="flex justify-center">
                        <button 
                            type='submit'
                            onClick={handleResetPassword}
                            disabled={loading}
                            className='w-96 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#0A9359] hover:bg-[#078048] disabled:opacity-50 mb-8'
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}