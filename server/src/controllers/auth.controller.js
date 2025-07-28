const { createClient } = require('@supabase/supabase-js');
const { sendOTPEmail } = require('../services/emailService');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const resetPassword = async (req, res) => {
  try {
    console.log('Reset password request received:', req.body);
    
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      console.error('Missing fields:', { userId: !!userId, newPassword: !!newPassword });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('Received userId from users_profile:', userId);

    // First verify the user exists in users_profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_profile')
      .select('email')
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('User profile not found:', profileError);
      return res.status(404).json({ message: 'User not found in users_profile' });
    }

    console.log('Found user profile with email:', userProfile.email);

    // Use the custom function to reset password
    console.log('Calling reset_user_password function...');
    
    const { data, error } = await supabaseAdmin.rpc('reset_user_password', {
      user_id: userId,
      new_password: newPassword
    });

    if (error) {
      console.error('Error calling reset_user_password function:', error);
      return res.status(500).json({ 
        message: 'Error updating password',
        error: error.message
      });
    }

    console.log('Function result:', data);

    if (data && data.success) {
      console.log('Password updated successfully!');
      res.status(200).json({ message: 'Password updated successfully' });
    } else {
      console.error('Function returned error:', data);
      return res.status(500).json({ 
        message: data?.message || 'Failed to update password'
      });
    }
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to reset password',
      error: error.message
    });
  }
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

const login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    
    const { employeeNumber, password } = req.body;

    if (!employeeNumber || !password) {
      return res.status(400).json({ message: 'Employee number and password are required' });
    }

    // Step 1: Find user by employee_number and get email from users_profile
    const { data: userData, error: userError } = await supabaseAdmin
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
      console.error('User not found:', userError);
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }

    // Step 2: Use the email from users_profile to authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.users_profile.email,
      password,
    });

    if (authError) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ message: 'Invalid employee number or password' });
    }

    // Step 3: Return user data and token
    const responseData = {
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
    };

    console.log('Login successful for employee:', employeeNumber);
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  resetPassword,
  sendOTP,
  login
};
