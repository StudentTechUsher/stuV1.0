import { Metadata } from 'next';
import { Box, Typography, Container } from '@mui/material';

export const metadata: Metadata = {
  title: 'Manage Advisors | Student Tech Usher',
  description: 'Manage academic advisors and their assignments',
};

export default function ManageAdvisorsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Manage Advisors
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page is under construction. Advisor management functionality will be available soon.
        </Typography>
      </Box>
    </Container>
  );
}
