# Technical Security Measures

**Last Updated:** December 2025
**Document Version:** 1.0

## Overview

This document details the technical security controls implemented to protect student data and ensure system integrity.

## Authentication

### Authentication Provider

We use **Supabase Auth**, an enterprise-grade authentication service built on PostgreSQL and industry standards.

**Key Features:**
- Secure password hashing (bcrypt)
- JWT-based session management
- Support for multiple authentication providers
- Account lockout after failed login attempts
- Email verification for new accounts

### Supported Authentication Methods

1. **Email/Password**
   - Minimum password requirements: [Define requirements - e.g., 8 characters, complexity]
   - Passwords hashed using bcrypt with salt
   - Secure password reset flow with time-limited tokens

2. **OAuth Providers** (Optional)
   - Google
   - Microsoft/Azure AD
   - Institutional SSO integration available

3. **Multi-Factor Authentication (MFA)**
   - Available for administrator and advisor accounts
   - TOTP (Time-based One-Time Password) support
   - SMS-based codes (optional)

### Session Management

- **Session Duration:** [Define - e.g., 24 hours for students, 8 hours for admins]
- **Secure Cookies:** HttpOnly, Secure, SameSite=Strict
- **Token Rotation:** Automatic refresh token rotation
- **Session Termination:** Automatic logout on inactivity
- **Concurrent Sessions:** Limited to [X] devices per user

## Authorization and Access Control

### Role-Based Access Control (RBAC)

The application implements a strict role-based access control system with three primary roles:

#### Role Hierarchy

| Role ID | Role Name | Access Level | Description |
|---------|-----------|--------------|-------------|
| 3 | Student | Limited | Access to own academic records and plans |
| 2 | Advisor | Moderate | Access to assigned students' records |
| 1 | Admin | Elevated | System administration and configuration |

#### Student (Role ID: 3)

**Permitted Actions:**
- View and edit own profile
- Create and manage own graduation plans
- View own academic history
- Communicate with assigned advisors
- Access career planning tools
- View own notifications

**Restrictions:**
- Cannot view other students' data
- Cannot access administrative functions
- Cannot modify system settings

**Implementation:**
```typescript
// Database Row-Level Security enforces this at the data layer
// Example: Students can only query their own profile
if (profile.role_id === 3) {
  // Limited to own data via RLS policy
}
```

#### Advisor (Role ID: 2)

**Permitted Actions:**
- View assigned students' profiles and plans
- Approve/reject graduation plans
- Communicate with students
- Generate reports for advisees
- Access advising dashboard
- Manage withdrawal notifications

**Restrictions:**
- Cannot view students not assigned to them
- Cannot access administrative settings
- Cannot modify university-wide configurations
- Cannot delete student data

**Implementation:**
```typescript
// Authorization checks in server actions
if (profile.role_id !== 2) {
  return { success: false, error: 'Unauthorized' };
}
```

#### Administrator (Role ID: 1)

**Permitted Actions:**
- All advisor permissions
- Manage university settings
- Manage degree programs and requirements
- User management (create, edit, delete)
- Access system-wide reports
- Configure application settings
- Access audit logs

**Restrictions:**
- Cannot access data from other universities (in multi-tenant setup)
- Critical operations require additional confirmation

**Implementation:**
```typescript
// Admin-only access enforcement
if (profile.role_id !== 1) {
  return { success: false, error: 'Admin access required' };
}
```

### Row-Level Security (RLS)

Database access is protected by PostgreSQL Row-Level Security policies:

**Students Table:**
```sql
-- Students can only read/write their own record
CREATE POLICY "Students can view own record"
  ON student FOR SELECT
  USING (auth.uid() = profile_id);
```

**Profiles Table:**
```sql
-- Users can only read/write their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

**Graduation Plans:**
```sql
-- Students can view/edit own plans
-- Advisors can view plans of their advisees
CREATE POLICY "Access own or assigned plans"
  ON graduation_plans FOR SELECT
  USING (
    auth.uid() = student_id OR
    auth.uid() IN (SELECT advisor_id FROM advisor_assignments WHERE student_id = graduation_plans.student_id)
  );
```

### Middleware Protection

The application uses Next.js middleware to protect routes:

**Protected Routes:**
- `/dashboard/*` - Requires authentication
- `/grad-plan/*` - Requires authentication
- `/advisees/*` - Requires advisor or admin role
- `/maintain-programs/*` - Requires admin role
- `/approve-grad-plans/*` - Requires advisor or admin role

**Public Routes:**
- `/` - Landing page
- `/login` - Authentication
- `/signup` - Registration
- `/about-us` - Public information
- `/privacy-policy` - Privacy policy
- `/security` - Security documentation (this page)

## Data Encryption

### Encryption at Rest

- **Database:** All data stored in PostgreSQL is encrypted at rest using AES-256
- **Backups:** Database backups are encrypted
- **File Storage:** [If applicable - describe file encryption]

### Encryption in Transit

- **TLS 1.3:** All communications use TLS 1.3 or higher
- **HTTPS Enforcement:** HTTP requests automatically redirected to HTTPS
- **Certificate Management:** Automated certificate renewal
- **HSTS:** HTTP Strict Transport Security enabled

### API Security

- **Authentication:** All API requests require valid JWT token
- **Rate Limiting:** [Define rate limits - e.g., 100 requests/minute per user]
- **CORS:** Strict CORS policy allowing only authorized domains
- **Input Validation:** All inputs validated and sanitized
- **SQL Injection Protection:** Parameterized queries prevent SQL injection

## Network Security

### Firewall Configuration

- **Database Access:** Limited to application servers only
- **Admin Interfaces:** IP-restricted access
- **Port Management:** Only necessary ports exposed

### Layered Defense

1. **Perimeter Layer:** CDN and DDoS protection
2. **Network Layer:** Firewall rules and network segmentation
3. **Application Layer:** WAF (Web Application Firewall)
4. **Database Layer:** Row-Level Security and encrypted connections

## Secure Development Practices

### Code Security

- **TypeScript:** Strict type checking prevents many common errors
- **ESLint:** Automated code quality and security checks
- **Dependency Scanning:** Regular scans for vulnerable dependencies
- **No Secrets in Code:** Environment variables for all sensitive data

### Input Validation

- **Schema Validation:** All user inputs validated against schemas (Yup/Zod)
- **XSS Protection:** React's built-in XSS protection + Content Security Policy
- **CSRF Protection:** SameSite cookies and CSRF tokens

### Security Headers

```javascript
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Vulnerability Management

### Patch Management

- **Dependency Updates:** Monthly security patch review
- **Critical Updates:** Applied within 48 hours of disclosure (typically same day)
- **Testing:** All patches tested in staging before production
- **Rollback Plan:** Quick rollback capability for failed updates

**Recent Example:**
In December 2025, we responded to critical vulnerabilities CVE-2025-55182 (React) and CVE-2025-66478 (Next.js) on the same day they were announced. Patches were applied, tested, and deployed to production within hours, demonstrating our commitment to rapid security response.

See [Security Updates & Patch History](./SECURITY_UPDATES.md) for complete vulnerability response timeline and details.

### Vulnerability Scanning

- **Automated Scans:** Daily npm audit scans
- **Dependency Monitoring:** Automated alerts for security updates
- **Penetration Testing:** Annual third-party penetration testing
- **Bug Bounty:** [If applicable - describe bug bounty program]

## Logging and Monitoring

### Security Logging

We log the following security-relevant events:

- Authentication attempts (success and failure)
- Authorization failures
- Data access (queries for sensitive data)
- Configuration changes
- User management actions
- API requests

**Log Retention:** 90 days for logs containing PII, 1 year for non-PII logs

### FERPA-Compliant Logging

All logs are designed to be FERPA-compliant:

- **Secure Storage:** Logs stored with encryption
- **Access Control:** Log access restricted to authorized personnel
- **PII Handling:** Student identifiers logged only when necessary
- **Automated Redaction:** Sensitive data redacted from logs

Example from `lib/logger.ts`:
```typescript
// Logs user actions without exposing PII in plain text
ferpaLog({
  action: 'VIEW_STUDENT_RECORD',
  userId: hash(userId), // Hashed identifier
  timestamp: new Date(),
  result: 'SUCCESS'
});
```

## Mobile Device Security

- **Responsive Design:** Application works on mobile browsers
- **No Native App:** Reduces attack surface
- **Session Security:** Mobile sessions have same security as desktop

## Third-Party Integrations

All third-party services undergo security review:

### Supabase (Database & Auth)
- **SOC 2 Type II Certified**
- **GDPR Compliant**
- **Data Encryption:** At rest and in transit
- **Regular Audits:** Independent security audits

### [Other Services]
[Document other third-party services and their security certifications]

## Incident Detection

- **Anomaly Detection:** Automated detection of unusual access patterns
- **Failed Login Monitoring:** Alerts on repeated failed logins
- **Data Exfiltration Detection:** Monitoring for large data exports
- **Real-time Alerts:** Security team notified of critical events

## Related Documents

- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [Data Governance](./DATA_GOVERNANCE.md)
- [Audit & Compliance](./AUDIT_COMPLIANCE.md)

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2025 | Initial release | [Your Team] |
