'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

export default function EmailTestingPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('Test');
  const [planAccessId, setPlanAccessId] = useState('test-access-id-123');
  const [advisorName, setAdvisorName] = useState('Dr. Smith');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!email || !email.includes('@')) {
      setResult({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/email-testing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: email,
          studentFirstName: firstName,
          planAccessId,
          advisorName
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Email Testing
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Test Graduation Plan Approval Email
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Student Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            placeholder="student@example.com"
            required
          />

          <TextField
            label="Student First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />

          <TextField
            label="Plan Access ID"
            value={planAccessId}
            onChange={(e) => setPlanAccessId(e.target.value)}
            fullWidth
          />

          <TextField
            label="Advisor Name (optional)"
            value={advisorName}
            onChange={(e) => setAdvisorName(e.target.value)}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleSendTestEmail}
            disabled={loading}
            sx={{
              backgroundColor: 'var(--primary)',
              '&:hover': { backgroundColor: 'var(--hover-green)' }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Test Email'}
          </Button>
        </Box>

        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            sx={{ mt: 2 }}
          >
            {result.message}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Instructions
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          1. Enter your email address to receive the test email
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          2. Customize the test data if needed
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          3. Click "Send Test Email" to trigger the email
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          4. Check your inbox (and spam folder) for the email
        </Typography>
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          Note: Make sure NEXT_PUBLIC_RESEND_API_KEY is set in your .env file
        </Typography>
      </Paper>
    </Box>
  );
}
