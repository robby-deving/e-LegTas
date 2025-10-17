import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import unionBackground from '../assets/Union.png';
import legTasLogo from '../assets/LegTas-Logo.png';

export default function ForgotPassword2(){
    usePageTitle('Create New Password');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
            const response = await fetch('https://api.e-legtas.tech/api/v1/auth/reset-password', {
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
        <div className='flex items-center justify-center min-h-screen bg-[#1CA567] p-4'>
            {/* Create New Password Container */}
            <div className='relative w-full h-auto max-w-[min(90vw,700px)] max-h-[95vh] sm:max-w-[min(80vw,650px)] md:max-w-[min(70vw,600px)] lg:max-w-[min(60vw,475px)]'>
                {/* Background Image */}
                <img 
                    src={unionBackground} 
                    alt="Create new password background" 
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
                            <h2 className='text-base sm:text-lg md:text-xl font-extrabold text-gray-500 text-center'>
                                Create New Password
                            </h2>
                            <p className='text-xs sm:text-sm text-gray-600 text-center'>
                                Your new password must be different from<br />your previous password.
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
                            
                            {/* New Password Field */}
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className='block text-xs sm:text-sm font-medium text-gray-800'>
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter new password"
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
                                            <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                                        ) : (
                                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Confirm Password Field */}
                            <div className="space-y-1 sm:space-y-1.5">
                                <label className='block text-xs sm:text-sm font-medium text-gray-800'>
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Input 
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className='pr-10 text-xs sm:text-sm bg-white'
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                                        ) : (
                                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Submit Button */}
                            <Button
                                type='submit'
                                disabled={loading}
                                className='w-full py-2 sm:py-2.5 px-4 rounded-md shadow-md text-xs sm:text-sm font-semibold text-white bg-[#0A9359] hover:bg-[#078048] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A9359] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer'
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                            
                        </form>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}