const { createClient } = require('@supabase/supabase-js');
const { sendOTPEmail } = require('../services/emailService');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (req, res) => {
  try {
    console.log('Send OTP request received:', req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists in users_profile table
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users_profile')
      .select('user_id, email')
      .eq('email', email)
      .single();

    if (userError || !userProfile) {
      // For security, we'll show success even if user doesn't exist
      return res.status(200).json({ 
        message: 'If an account with this email exists, a verification code has been sent.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10); // OTP expires in 10 minutes

    // Update users_profile with OTP
    const { error: otpError } = await supabaseAdmin
      .from('users_profile')
      .update({
        otp_code: otp,
        otp_expiration: expiration.toISOString()
      })
      .eq('email', email);

    if (otpError) {
      console.error('Error updating OTP:', otpError);
      return res.status(500).json({ message: 'Failed to generate OTP' });
    }

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({ message: 'Failed to send verification code' });
    }

    console.log(`OTP sent successfully to ${email}`);
    
    res.status(200).json({ 
      message: 'Verification code sent to your email successfully!' 
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      message: 'Failed to send verification code',
      error: error.message
    });
  }
};

module.exports = { sendOTP };