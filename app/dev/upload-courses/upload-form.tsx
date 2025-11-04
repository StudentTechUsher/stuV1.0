'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, LinearProgress, Paper } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';

interface UploadResult {
  success: boolean;
  deleted?: number;
  inserted?: number;
  validationErrors?: number;
  errorDetails?: Array<{ index: number; error: string }>;
  message?: string;
  error?: string;
}

export default function UploadForm() {
  const [password, setPassword] = useState('');
  const [universityId, setUniversityId] = useState('1');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        setResult({
          success: false,
          error: 'Please select a valid JSON file',
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setResult({
        success: false,
        error: 'Please select a file to upload',
      });
      return;
    }

    if (!password) {
      setResult({
        success: false,
        error: 'Please enter the upload password',
      });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      // Read the file
      const fileContent = await file.text();
      const courses = JSON.parse(fileContent);

      // Prepare the request body
      const requestBody = {
        courses,
        universityId: parseInt(universityId, 10),
        ...(replaceTerm && { replaceTerm }),
      };

      // Make the API request
      const response = await fetch('/api/dev/upload-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upload-password': password,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          ...data,
        });
        // Clear the form on success
        setFile(null);
        setReplaceTerm('');
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        setResult({
          success: false,
          error: data.error || 'Upload failed',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Course Offerings Upload
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Upload course offerings from a JSON file to the database
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Password Field */}
            <TextField
              label="Upload Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="off"
            />

            {/* University ID Field */}
            <TextField
              label="University ID"
              type="number"
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              required
              fullWidth
              helperText="1 = BYU, 2 = Other universities..."
            />

            {/* Replace Term Field */}
            <TextField
              label="Replace Term (Optional)"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              fullWidth
              helperText='If specified, existing courses for this term will be deleted first (e.g., "Winter 2026")'
            />

            {/* File Upload */}
            <Box>
              <input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  {file ? file.name : 'Select JSON File'}
                </Button>
              </label>
              {file && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  File size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              )}
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              disabled={uploading || !file || !password}
              fullWidth
              size="large"
            >
              {uploading ? 'Uploading...' : 'Upload Courses'}
            </Button>
          </Box>
        </form>

        {/* Progress Indicator */}
        {uploading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Processing courses... This may take a few moments.
            </Typography>
          </Box>
        )}

        {/* Results */}
        {result && (
          <Box sx={{ mt: 3 }}>
            {result.success ? (
              <Alert severity="success">
                <Typography variant="body1" fontWeight="bold">
                  {result.message}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Inserted: {result.inserted || 0} courses
                  {result.deleted ? ` | Deleted: ${result.deleted} courses` : ''}
                  {result.validationErrors ? ` | Validation errors: ${result.validationErrors}` : ''}
                </Typography>
                {result.errorDetails && result.errorDetails.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight="bold">
                      First few validation errors:
                    </Typography>
                    {result.errorDetails.slice(0, 5).map((err) => (
                      <Typography key={err.index} variant="caption" display="block">
                        Row {err.index}: {err.error}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            ) : (
              <Alert severity="error">
                <Typography variant="body1" fontWeight="bold">
                  Upload Failed
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {result.error}
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
