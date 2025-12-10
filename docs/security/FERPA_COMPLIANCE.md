# FERPA Compliance

**Last Updated:** December 2025
**Document Version:** 1.0

## Overview

This document explains how our application complies with the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g.

## What is FERPA?

The Family Educational Rights and Privacy Act (FERPA) is a federal law that protects the privacy of student education records. FERPA applies to all schools and institutions that receive funds under an applicable program of the U.S. Department of Education.

**FERPA Grants Students:**
1. Right to inspect and review education records
2. Right to request amendment of records
3. Right to control disclosure of personally identifiable information (PII)
4. Right to file a complaint with the Department of Education

## Education Records Definition

### What We Consider Education Records

Under our application, education records include:

- **Student Profile Information:** Name, email, student ID
- **Academic History:** Transcript data, courses taken, grades
- **Graduation Plans:** Degree plans, course selections
- **Advisor Communications:** Messages between students and advisors
- **Academic Progress:** Completion status, milestones
- **Career Goals:** Student-entered career interests and plans

### What Are NOT Education Records

The following are NOT considered education records under FERPA:

- **Sole Possession Records:** Personal notes of advisors not shared with others
- **Law Enforcement Records:** Campus security records
- **Employment Records:** Student employee records (when employment is unrelated to student status)
- **Alumni Records:** Records created after student is no longer enrolled
- **De-identified Data:** Data that cannot be linked to a specific student

## Personally Identifiable Information (PII)

### Direct Identifiers

We collect and protect these direct identifiers:

- Student name
- Student email address
- Student ID number
- Date of birth (if collected)
- University affiliation

### Indirect Identifiers

Information that, combined, could identify a student:

- Major/program of study
- Graduation date
- Course schedules
- Advisor assignments

### PII Protection Measures

**Technical Controls:**
- Encryption at rest and in transit
- Role-based access control
- Row-level security in database
- Secure authentication

**Administrative Controls:**
- Data minimization (collect only what's needed)
- Access logging and monitoring
- Personnel training
- Confidentiality agreements

## Permitted Disclosures Under FERPA

### 1. Disclosure with Written Consent

Students may provide written consent to disclose their education records. Our system:

- **Consent Forms:** Digital consent collection
- **Specific Disclosure:** Consent specifies what data and to whom
- **Audit Trail:** All consented disclosures are logged
- **Revocation:** Students can revoke consent

### 2. Disclosure to School Officials with Legitimate Educational Interest

**School Officials Include:**
- Academic advisors
- University administrators
- Faculty members
- IT staff (for system maintenance)

**Legitimate Educational Interest:**
- Must be necessary for job duties
- Limited to need-to-know basis
- Our Implementation:
  - Role-based access (Student, Advisor, Admin)
  - RLS policies enforce data access
  - Access logging for accountability

### 3. Directory Information

**What is Directory Information:**
Information that is generally not considered harmful or an invasion of privacy if disclosed.

**Common Examples:**
- Student name
- Email address
- Major field of study
- Dates of attendance
- Degrees received

**Our Implementation:**
- Universities can define what constitutes directory information
- Students can opt-out of directory information disclosure
- Opt-out preferences stored and enforced

### 4. Other FERPA Exceptions

**We support disclosure for:**

- **Other Schools:** When student transfers
- **Financial Aid:** For determining eligibility
- **Accrediting Organizations:** For accreditation purposes
- **Legal Compliance:** In response to subpoenas or court orders
- **Health and Safety Emergencies:** To protect health and safety
- **Research:** For studies (with proper safeguards and de-identification)

## Student Rights Implementation

### 1. Right to Inspect and Review Records

**Our Implementation:**
- Students can view all their education records through their dashboard
- Academic history, graduation plans, and profile information accessible 24/7
- Export functionality to download records
- No fee for accessing records

**Timeline:**
- Instant access through web application
- Exceeds FERPA requirement of 45 days

### 2. Right to Request Amendment

**Process:**
1. Student requests amendment through [specified process]
2. University reviews request (within 45 days)
3. If approved, record is updated
4. If denied, student can request a hearing
5. Student may add a statement to the record

**Our Role:**
- Provide mechanism for universities to update records
- Maintain audit trail of changes
- Support adding explanatory statements

### 3. Right to Control Disclosure

**Our Implementation:**
- Students control consent for non-FERPA-exception disclosures
- Privacy settings for directory information opt-out
- Transparency through access logs (students can see who viewed their records)

### 4. Right to File a Complaint

**Students may file complaints with:**

Family Policy Compliance Office
U.S. Department of Education
400 Maryland Avenue, SW
Washington, DC 20202-5920

**Our Cooperation:**
- Respond to FPCO inquiries within required timeframes
- Provide documentation of policies and procedures
- Remediate any identified deficiencies

## Multi-Tenant Security (University Isolation)

Our application serves multiple universities with strict data isolation:

### Database-Level Isolation

- **University ID:** All records tagged with `university_id`
- **RLS Policies:** Enforce university-level data isolation
- **No Cross-University Access:** Students, advisors, and admins cannot access data from other universities

```sql
-- Example RLS policy
CREATE POLICY "University data isolation"
  ON profiles FOR ALL
  USING (university_id = (
    SELECT university_id FROM profiles WHERE id = auth.uid()
  ));
```

### Application-Level Controls

- **Subdomain Routing:** Each university has unique subdomain
- **Session Management:** University context stored in session
- **API Filtering:** All queries filtered by university_id
- **Audit Logging:** All cross-university access attempts logged

## Logging and Auditing for FERPA Compliance

### What We Log

**Access Logs:**
- Who accessed student records
- What records were accessed
- When access occurred
- Purpose of access (context)
- Result (success/denied)

**Modification Logs:**
- Record changes (before/after values)
- Who made the change
- When change was made
- Reason for change (if provided)

**Disclosure Logs:**
- What information was disclosed
- To whom it was disclosed
- When disclosure occurred
- Legal basis for disclosure

### Log Security

- **Encryption:** Logs encrypted at rest
- **Access Control:** Restricted to authorized personnel only
- **Retention:** 90 days for PII logs, 1 year for non-PII
- **Immutability:** Logs cannot be modified or deleted
- **Regular Review:** Quarterly review of access patterns

### Sample Log Entry

```typescript
{
  timestamp: "2025-12-08T10:30:00Z",
  userId: "hashed_user_id",
  action: "VIEW_STUDENT_RECORD",
  targetStudentId: "hashed_student_id",
  universityId: 1,
  userRole: "advisor",
  result: "SUCCESS",
  ipAddress: "hashed_ip",
  context: "graduation_plan_review"
}
```

## Data Breach Response

### FERPA-Specific Breach Requirements

**Assessment:**
- Determine if education records were compromised
- Assess potential harm to students
- Identify number of affected students

**Notification:**
- Students/parents whose records were compromised
- University (if we are a service provider)
- Department of Education (for certain violations)

**Timeline:**
- Varies by state law, but generally within 30-60 days

See [Incident Response Plan](./INCIDENT_RESPONSE.md) for full procedures.

## Service Provider Responsibilities

As a service provider to educational institutions:

### Data Processing Agreement (DPA)

We sign DPAs with universities that include:

- **Purpose Limitation:** Use data only for agreed purposes
- **Data Security:** Maintain appropriate security measures
- **Confidentiality:** Treat data as confidential
- **Breach Notification:** Notify university of any breach
- **Data Return/Deletion:** Return or delete data upon termination
- **Audit Rights:** Allow university to audit our controls

### School Official Designation

We function as "school officials" with legitimate educational interest when:

- Performing services on behalf of the university
- Under direct control of the university
- Using education records only for authorized purposes
- Subject to FERPA requirements

## Third-Party Subprocessors

Any subprocessors we use must:

- Sign Data Processing Agreements
- Demonstrate FERPA compliance understanding
- Implement appropriate security measures
- Allow audit of their controls

**Current Subprocessors:**
- Supabase (Database and Authentication)
  - Security certifications: SOC 2 Type II, ISO 27001
  - GDPR compliance: Yes
  - Data location: [Specify region]

[Add other subprocessors as applicable]

## De-Identification for Research and Analytics

### Aggregate Reporting

We provide aggregate reports that do not contain PII:

- Minimum cell size of 10 students
- Suppression of small numbers
- Rounding to prevent re-identification
- No direct or indirect identifiers

### De-Identification Standards

Following NIST and FERPA guidelines:

- **Direct Identifiers:** Removed (names, IDs, emails)
- **Indirect Identifiers:** Generalized (graduation year → year range)
- **Unique Combinations:** Suppressed or generalized
- **Re-identification Risk:** Assessed before release

## Student Data Privacy Statement

Students are provided with a clear privacy statement explaining:

- What data we collect
- How we use the data
- Who has access to the data
- How data is protected
- Student rights under FERPA
- How to exercise those rights

**Location:** [Link to privacy policy on website]

## Training and Awareness

### FERPA Training for Personnel

**All personnel with access to student data complete:**

- Initial FERPA training (within first week)
- Annual refresher training
- Role-specific training
- Updates on FERPA guidance

**Training Topics:**
- What is FERPA and why it matters
- What constitutes education records
- Permitted and prohibited disclosures
- Student rights
- Data security requirements
- Consequences of violations

### University Training

We provide training resources to universities:

- Admin user guides
- Best practices for FERPA compliance
- How to use our security features
- How to respond to student requests

## Continuous Compliance

### Regular Reviews

- **Quarterly:** Access permission review
- **Semi-Annual:** Privacy policy review
- **Annual:** Full FERPA compliance assessment
- **As Needed:** Review after regulatory changes

### Compliance Monitoring

- Automated compliance checks
- Regular security audits
- Third-party assessments
- Student feedback mechanisms

### Regulatory Updates

- Monitor Department of Education guidance
- Subscribe to FERPA updates
- Participate in privacy compliance forums
- Update policies as regulations evolve

## Related Documents

- [Security Overview](./SECURITY_OVERVIEW.md)
- [Technical Security](./TECHNICAL_SECURITY.md)
- [Data Governance](./DATA_GOVERNANCE.md)
- [Incident Response](./INCIDENT_RESPONSE.md)

## Resources

- **FERPA Statute:** 20 U.S.C. § 1232g
- **FERPA Regulations:** 34 CFR Part 99
- **PTAC Website:** https://studentprivacy.ed.gov
- **Family Policy Compliance Office:** (202) 260-3887

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2025 | Initial release | [Your Team] |
