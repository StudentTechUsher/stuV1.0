import { Box, Typography, Container, Paper } from '@mui/material';

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Privacy Policy for Student Tech Usher
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: September 19, 2025
        </Typography>

        <Box sx={{ '& > *': { mb: 3 } }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              1. Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              At Student Tech Usher, we are committed to protecting and respecting your privacy. This Privacy Policy outlines how we collect, use, disclose, and safeguard your personal data when you visit our platform, in compliance with Regulation (EU) 2016/679 (General Data Protection Regulation - GDPR).
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              2. Scope of this Policy
            </Typography>
            <Typography variant="body1" paragraph>
              This Policy applies to the processing of personal data of:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Students using the platform for academic planning and communication;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Academic Advisors interacting with students for guidance and evaluation;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Institutional Administrators managing user roles and academic programs.
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              3. Data Controller
            </Typography>
            <Typography variant="body1" paragraph>
              The data controller is:
            </Typography>
            <Box sx={{ pl: 2, py: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body1">Student Tech Usher</Typography>
              <Typography variant="body1">[Postal Address]</Typography>
              <Typography variant="body1">admin@stuplanning.com</Typography>
              <Typography variant="body1">[Phone Number]</Typography>
            </Box>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              For data protection matters, please contact our Data Protection Officer at: [DPO Email]
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              4. Categories of Personal Data Collected
            </Typography>
            <Typography variant="body1" paragraph>
              Depending on your role, we may process the following data:
            </Typography>
            
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              For Students:
            </Typography>
            <Typography variant="body1" paragraph>
              Name, contact details, academic records, course enrollments, login credentials, communications with advisors.
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              For Advisors:
            </Typography>
            <Typography variant="body1" paragraph>
              Name, institutional role, contact details, student notes, meeting schedules.
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              For Admins:
            </Typography>
            <Typography variant="body1" paragraph>
              User role management data, institutional settings, system access logs.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              5. Legal Basis for Processing
            </Typography>
            <Typography variant="body1" paragraph>
              We process your personal data under the following legal bases (Article 6 GDPR):
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Performance of a contract (e.g., providing educational services) – Art. 6(1)(b);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Legal obligation (e.g., academic records retention) – Art. 6(1)(c);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Legitimate interests (e.g., ensuring platform security, analytics) – Art. 6(1)(f);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Consent for optional features like newsletter subscriptions – Art. 6(1)(a).
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              6. Purpose of Data Processing
            </Typography>
            <Typography variant="body1" paragraph>
              We use your data to:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Facilitate academic planning and communication;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Enable access to educational tools and resources;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Monitor usage and improve platform functionality;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Comply with legal and institutional obligations.
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              7. Data Sharing and Transfers
            </Typography>
            <Typography variant="body1" paragraph>
              Data may be shared with:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Authorized institutional staff;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                IT service providers under strict data protection agreements;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Regulators or authorities if required by law.
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              We do not transfer personal data outside the EEA unless adequate safeguards are in place in line with Chapter V of the GDPR.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              8. Data Retention
            </Typography>
            <Typography variant="body1" paragraph>
              We retain personal data only as long as necessary to fulfill the purposes outlined or as required by law. Retention periods vary by data category and user role.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              9. Your Data Protection Rights
            </Typography>
            <Typography variant="body1" paragraph>
              You have the following rights under GDPR:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Right of access (Art. 15);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to rectification (Art. 16);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to erasure (&quot;right to be forgotten&quot;) (Art. 17);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to restriction of processing (Art. 18);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to data portability (Art. 20);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to object (Art. 21);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to lodge a complaint with a supervisory authority.
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              To exercise your rights, please contact [DPO Email].
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              10. Cookies and Tracking Technologies
            </Typography>
            <Typography variant="body1" paragraph>
              Our website uses cookies and similar technologies in accordance with the ePrivacy Directive and Article 5(3) thereof. You can manage your preferences via our Cookie Settings Page.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              11. Automated Decision-Making
            </Typography>
            <Typography variant="body1" paragraph>
              We do not engage in automated decision-making, including profiling, that produces legal effects concerning you.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              12. Changes to This Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy from time to time. The most recent version will always be posted on our website with the effective date.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 4, p: 2, backgroundColor: '#f0f8ff', borderRadius: 1, border: '1px solid #e3f2fd' }}>
          <Typography variant="body2" color="text.secondary">
            If you have any questions about this Privacy Policy or our data practices, please contact us at the information provided above.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}