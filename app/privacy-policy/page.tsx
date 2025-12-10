import { Box, Typography, Container, Paper } from '@mui/material';

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Privacy Policy for Student Tech Usher
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: December 9, 2025
        </Typography>

        <Box sx={{ mb: 4, p: 2, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffc107' }}>
          <Typography variant="body2">
            <strong>For U.S. Educational Institutions:</strong> This platform complies with the Family Educational Rights and Privacy Act (FERPA). We handle student education records in accordance with FERPA requirements and institutional policies.
          </Typography>
        </Box>

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
            <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Important: All student data we collect is provided directly by you. We do not collect data from third parties without your knowledge.
            </Typography>
            <Typography variant="body1" paragraph>
              Depending on your role, we may process the following data:
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              For Students:
            </Typography>
            <Typography variant="body1" paragraph>
              Name, contact details, academic records (that you provide), course enrollments, graduation plans, login credentials, communications with advisors, career goals and preferences.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You control what information you provide to the platform. You may upload your transcript, enter course information, and create graduation plans. We only know what you tell us.
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
              7. Data Sharing and Access
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              Who Can See Your Data:
            </Typography>
            <Typography variant="body1" paragraph>
              Your student data (including graduation plans) may be accessed by:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                <strong>You:</strong> Full access to all your data;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                <strong>Authorized Academic Advisors:</strong> Only advisors approved by your institution for your specific academic program(s) have limited access to view and edit details in your graduation plans to provide guidance;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                <strong>Your Institution&apos;s Administrators:</strong> Staff designated by your university to manage the platform;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                <strong>IT Service Providers:</strong> Technical personnel under strict data protection agreements (for system maintenance only, not for viewing student information);
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                <strong>Legal Authorities:</strong> Only if required by law or valid legal process.
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
              <strong>Access Control:</strong> Advisors can only access graduation plans for students in programs they are authorized to advise. They cannot see data for students outside their assigned programs.
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 3, mb: 1 }}>
              International Data Transfers:
            </Typography>
            <Typography variant="body1" paragraph>
              We do not transfer personal data outside the EEA unless adequate safeguards are in place in line with Chapter V of the GDPR. For U.S.-based institutions, data is stored and processed within the United States.
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 3, mb: 1 }}>
              What We Do NOT Do:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                We do NOT sell your data to third parties;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                We do NOT share your data with marketing companies;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                We do NOT use your academic records for purposes unrelated to educational planning;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                We do NOT allow unauthorized advisors to access your information.
              </Typography>
            </Box>
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
              11. FERPA Compliance (U.S. Educational Institutions)
            </Typography>
            <Typography variant="body1" paragraph>
              For students at U.S. educational institutions, we comply with the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g.
            </Typography>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              Your Rights Under FERPA:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Right to inspect and review your education records;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to request amendment of inaccurate records;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to consent to disclosures of personally identifiable information;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Right to file a complaint with the U.S. Department of Education.
              </Typography>
            </Box>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              FERPA-Permitted Disclosures:
            </Typography>
            <Typography variant="body1" paragraph>
              We disclose your information only as permitted under FERPA, including:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                <strong>School Officials with Legitimate Educational Interest:</strong> Authorized advisors and administrators at your institution who need access to fulfill their professional responsibilities;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                <strong>With Your Consent:</strong> When you provide written consent for specific disclosures;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                <strong>As Required by Law:</strong> In response to lawfully issued subpoenas or court orders.
              </Typography>
            </Box>

            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
              Institutional Role:
            </Typography>
            <Typography variant="body1" paragraph>
              Your educational institution retains ownership and control of your education records. We act as a service provider on behalf of your institution. Your institution&apos;s FERPA policies and procedures apply to the data stored in this platform.
            </Typography>

            <Typography variant="body2" sx={{ mt: 2, p: 2, backgroundColor: '#f0f8ff', borderRadius: 1 }}>
              <strong>Questions about FERPA?</strong> Contact your institution&apos;s Registrar or FERPA Compliance Officer. To file a FERPA complaint, contact: Family Policy Compliance Office, U.S. Department of Education, 400 Maryland Avenue, SW, Washington, DC 20202.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              12. Automated Decision-Making
            </Typography>
            <Typography variant="body1" paragraph>
              We do not engage in automated decision-making, including profiling, that produces legal effects concerning you. AI features are advisory only and all decisions remain with you and your advisors.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              13. Data Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body1" paragraph>
                Encryption of data in transit and at rest;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Role-based access controls limiting who can view your data;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Regular security audits and vulnerability assessments;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Employee training on FERPA and data privacy requirements;
              </Typography>
              <Typography component="li" variant="body1" paragraph>
                Comprehensive audit logging of all data access.
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              For detailed information about our security practices, please see our Security Documentation or contact our security team.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              14. Changes to This Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy from time to time. The most recent version will always be posted on our website with the effective date. If we make material changes, we will notify you through the platform or via email.
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