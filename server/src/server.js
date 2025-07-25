const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { resetPassword } = require('../routes/resetPassword.js');
const { sendOTP } = require('../routes/sendOTP.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables check
console.log('Environment variables check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Found' : 'Missing');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Found' : 'Missing');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/reset-password', resetPassword);
app.post('/api/send-otp', sendOTP);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});