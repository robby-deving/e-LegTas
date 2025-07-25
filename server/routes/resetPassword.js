// server/routes/resetPassword.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
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

module.exports = { resetPassword };