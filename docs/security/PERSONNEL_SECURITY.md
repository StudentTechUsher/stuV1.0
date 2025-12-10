# Personnel Security

**Last Updated:** December 2025
**Document Version:** 1.0

## Overview

This document outlines personnel security policies and procedures to ensure that individuals with access to student data are trustworthy and properly trained.

## Background Checks and Screening

### Pre-Employment Screening

All employees with access to student data undergo:

- **Background Checks:** Criminal background verification
- **Reference Checks:** Verification of previous employment
- **Education Verification:** Confirmation of educational credentials
- **Identity Verification:** Government-issued ID verification

### Ongoing Screening

- **Annual Reviews:** Review of continued trustworthiness
- **Incident-Based Reviews:** Review after security incidents
- **Access Recertification:** Quarterly review of access permissions

## Acceptable Use Policy (AUP)

All personnel must acknowledge and comply with our Acceptable Use Policy.

### Acceptable Uses

**Employees MAY:**
- Access student data necessary for job duties
- Use systems for legitimate business purposes
- Access resources from approved locations and devices
- Share information with authorized colleagues on a need-to-know basis

**Employees MAY NOT:**
- Access student data out of curiosity
- Share login credentials with others
- Use personal devices without approval
- Download student data to personal storage
- Share student data outside approved channels
- Access data for non-business purposes

### Internet and Email Usage

- **Business Use:** Primary use for business purposes
- **Limited Personal Use:** Minimal personal use permitted
- **Prohibited Activities:**
  - Accessing inappropriate content
  - Downloading unauthorized software
  - Sharing confidential information via unencrypted email
  - Clicking suspicious links or attachments

## Security Training

### Initial Training

All new employees complete security training within first week using official Department of Education resources:

- **FERPA Training:** U.S. Department of Education online training modules at https://studentprivacy.ed.gov/content/online-training-modules
- **Security Awareness:** Phishing, social engineering, password security
- **System-Specific Training:** How to use systems securely
- **Incident Reporting:** How to report security concerns

**Training must be completed BEFORE access to any student data is granted.**

### Ongoing Training

- **Annual Refresher:** Yearly FERPA training via ED.gov modules
- **Role-Specific Training:** Additional training based on job role
- **Ad-Hoc Training:** Training on new threats and procedures (may trigger additional FERPA refreshers)
- **Phishing Simulations:** Quarterly simulated phishing tests

### Training Documentation

All training completion is tracked and documented:
- Training completion certificates stored in secure compliance folder
- Training tracker maintained with employee name, module, completion date
- Certificates retained for duration of employment + 3 years
- Available for audit review upon request

### Training Topics

1. **FERPA Compliance**
   - What constitutes education records
   - When disclosure is permitted
   - Student rights under FERPA
   - Consequences of violations

2. **Data Classification**
   - Types of data and sensitivity levels
   - How to handle each classification
   - Proper disposal methods

3. **Physical Security**
   - Clean desk policy
   - Locking workstations
   - Visitor procedures
   - Secure disposal of paper records

4. **Cybersecurity**
   - Password best practices
   - Recognizing phishing attempts
   - Safe browsing habits
   - Malware prevention

5. **Incident Response**
   - Recognizing security incidents
   - Reporting procedures
   - Roles during incidents

## Confidentiality Agreements

### Non-Disclosure Agreement (NDA)

All employees sign NDAs covering:

- **Student Data:** Protection of all student information
- **Duration:** Obligations continue after employment ends
- **Penalties:** Consequences of unauthorized disclosure
- **Third Parties:** Prohibition on sharing with external parties

### FERPA Acknowledgment

Separate acknowledgment that employee has:

- Completed FERPA training
- Understands FERPA requirements
- Agrees to comply with FERPA
- Understands penalties for violations

## Access Management

### Database Access Tiers

Stu operates on a strict access control model for university databases:

**Tier 0 - No Access (Default)**
- All employees by default have NO access to production student data
- This is the default state for all personnel

**Tier 1 - Monitoring Only**
- Database health monitoring (no PII access)
- Performance metrics
- System status checks
- Requires: FERPA training

**Tier 2 - Anonymized Data Access**
- Access to de-identified datasets only
- For approved data analysis projects
- Requires: FERPA training, project approval, NDA
- Limited to data experts with legitimate analytical purpose

**Tier 3 - AI Response Data**
- Access to AI conversation/response tables only
- For model improvement and safety monitoring
- Requires: FERPA training, role approval, NDA
- Limited to AI/ML engineers with legitimate purpose

**Tier 4 - Write Access to University Database**
- **RESTRICTED** to official Stu consulting representatives only
- Full database access for setup, configuration, and support
- Requires: FERPA training, background check, NDA, manager approval
- All actions logged and auditable
- Access reviewed quarterly

**Database Isolation:**
Each partner university receives a dedicated, isolated database instance. Stu employees cannot access data across university boundaries.

### Onboarding Process

1. **Access Request:** Manager submits access request with tier justification
2. **Background Check:** Completed for Tier 2+ access
3. **FERPA Training:** Employee completes ED.gov training modules
4. **Approval:** Security team reviews and approves based on role necessity
5. **Confidentiality Agreement:** Employee signs NDA and FERPA acknowledgment
6. **Provisioning:** IT creates accounts with appropriate tier permissions
7. **Acknowledgment:** Employee signs acceptable use policy

**Access is NEVER granted before all requirements are met.**

### During Employment

- **Least Privilege:** Access limited to necessary data only
- **Regular Reviews:** Quarterly access recertification
- **Role Changes:** Access adjusted when role changes
- **Temporary Access:** Time-limited access for special projects (requires approval)
- **Access Logging:** All database access logged and monitored

### Offboarding Process

1. **Notification:** HR notifies IT of departure
2. **Access Revocation:** All access removed on last day
3. **Asset Return:** Collection of devices and credentials
4. **Exit Interview:** Reminder of ongoing confidentiality obligations
5. **Account Deletion:** Accounts deleted after retention period

## Remote Work Security

### Requirements

- **Approved Devices:** Only company-approved devices
- **VPN Usage:** VPN required for remote access
- **Secure Networks:** No public Wi-Fi without VPN
- **Physical Security:** Privacy screens, locked doors during work
- **Clean Desk:** No sensitive documents left visible

### Remote Access

- **Multi-Factor Authentication:** Required for all remote access
- **Session Timeout:** 15-minute inactivity timeout
- **Device Encryption:** Full disk encryption required
- **Antivirus:** Up-to-date antivirus software required

## Insider Threat Prevention

### Monitoring

- **Access Logging:** All data access is logged
- **Anomaly Detection:** Unusual access patterns flagged
- **Privileged User Monitoring:** Enhanced monitoring of admin accounts
- **Data Loss Prevention:** Automated detection of bulk data exports

### Warning Signs

We monitor for indicators of insider threats:

- Excessive data access outside normal patterns
- Access attempts outside working hours
- Failed authorization attempts
- Attempts to escalate privileges
- Large data downloads

### Response

- **Investigation:** Security team investigates anomalies
- **Interview:** Discussion with employee if concerns arise
- **Restriction:** Temporary access restriction during investigation
- **Termination:** Immediate access revocation if threat confirmed

## Contractor and Vendor Management

### Third-Party Personnel

Contractors and vendors with data access must:

- **Background Checks:** Same screening as employees
- **Training:** Complete FERPA and security training
- **Agreements:** Sign NDAs and acceptable use policies
- **Supervision:** Work under supervision of employees
- **Limited Access:** Minimum necessary access only

### Vendor Agreements

All vendors handling student data must:

- **Data Processing Agreement (DPA):** Sign formal DPA
- **Security Requirements:** Meet our security standards
- **Right to Audit:** Allow security audits
- **Breach Notification:** Immediate notification of breaches
- **Data Return/Deletion:** Proper data handling upon termination

## Violations and Consequences

### Types of Violations

- **Minor:** Unintentional policy violations (e.g., weak password)
- **Moderate:** Careless handling of data (e.g., unencrypted email)
- **Major:** Intentional policy violations (e.g., unauthorized access)
- **Critical:** Malicious activity (e.g., data theft)

### Disciplinary Actions

| Violation Level | Potential Consequences |
|----------------|------------------------|
| Minor | Warning, additional training |
| Moderate | Written warning, temporary access restriction |
| Major | Suspension, access revocation, possible termination |
| Critical | Immediate termination, legal action |

### Legal Consequences

FERPA violations can result in:

- **Institutional Penalties:** Loss of federal funding for institution
- **Individual Liability:** Personal legal liability
- **Criminal Charges:** In cases of identity theft or fraud

## Roles and Responsibilities

### All Employees

- Follow acceptable use policy
- Protect login credentials
- Report security incidents
- Complete required training
- Lock workstations when away

### Managers

- Ensure team completes training
- Request appropriate access for team
- Review team access quarterly
- Report policy violations
- Model secure behaviors

### Security Team

- Conduct security training
- Monitor for violations
- Investigate incidents
- Update policies as needed
- Provide security guidance

### HR Department

- Conduct background checks
- Coordinate onboarding/offboarding
- Maintain training records
- Handle disciplinary actions
- Ensure policy acknowledgments

## Related Documents

- [Data Governance](./DATA_GOVERNANCE.md)
- [Technical Security](./TECHNICAL_SECURITY.md)
- [Incident Response](./INCIDENT_RESPONSE.md)

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2025 | Initial release | [Your Team] |
