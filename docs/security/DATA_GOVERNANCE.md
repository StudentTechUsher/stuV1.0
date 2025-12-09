# Data Governance

**Last Updated:** December 2025
**Document Version:** 1.0

## Purpose

This document outlines our data governance policies, procedures, and standards for managing student data in compliance with FERPA and other applicable regulations.

## Data Classification

### Levels of Sensitivity

1. **Public Data**
   - University information (name, location, programs offered)
   - Course catalogs
   - Non-identifying aggregated statistics

2. **Internal Data**
   - System logs (without PII)
   - Application configuration
   - Anonymized usage metrics

3. **Confidential Data**
   - Student names and email addresses
   - Academic records
   - Graduation plans
   - Advisor communications

4. **Restricted Data**
   - Social Security Numbers (if collected)
   - Financial aid information
   - Disability accommodations
   - Disciplinary records

**Note:** We minimize collection of Restricted Data and only store such data when legally required.

## Data Minimization

We adhere to the principle of data minimization:

- **Only collect data necessary** for educational planning and advising
- **Avoid collecting sensitive identifiers** unless legally required
- **Regular review** of data collection practices
- **Automated purging** of unnecessary data

## Data Retention

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| Active student records | Duration of enrollment + 7 years | FERPA requirements |
| Graduated student records | 7 years post-graduation | Industry standard |
| System logs (with PII) | 90 days | Security monitoring |
| System logs (without PII) | 1 year | Performance analysis |
| Deleted account data | 30 days (soft delete) | Recovery period |

## Data Access Principles

### Least Privilege

Users are granted the minimum level of access necessary to perform their duties:

- **Students:** Access to their own records only
- **Advisors:** Access to assigned advisees' records
- **Administrators:** Access based on job responsibilities

### Need-to-Know

Access to student data is restricted to individuals with a legitimate educational interest.

## Data Sharing

### Internal Sharing

- Data is shared internally only with authorized personnel
- All access is logged and auditable
- Role-based access controls enforce sharing policies

### External Sharing

We **do not** share student data with third parties except:

1. **With explicit student consent**
2. **As required by law** (subpoena, court order)
3. **Directory information** (if student has not opted out)
4. **Emergency situations** (health and safety)

### Third-Party Service Providers

Any third-party services that process student data must:

- Sign a Data Processing Agreement (DPA)
- Demonstrate FERPA compliance
- Undergo security assessment
- Provide evidence of encryption and access controls

**Current Third-Party Services:**
- Supabase (Database and Authentication)
- [Add other services as applicable]

## Data Quality

We maintain data quality through:

- **Validation rules** on data entry
- **Regular audits** of data accuracy
- **Student self-service** for profile updates
- **Advisor review** of academic plans

## Roles and Responsibilities

### Data Steward
- Overall responsibility for data governance program
- Approves data policies
- Reviews data sharing agreements

### System Administrators
- Implement technical controls
- Monitor access logs
- Manage user permissions

### Advisors
- Ensure accuracy of advisee data
- Report data quality issues
- Follow data access protocols

### Students
- Maintain accurate profile information
- Exercise FERPA rights
- Report unauthorized access

## Policy Review

This policy is reviewed annually and updated as needed to reflect:

- Changes in applicable laws
- New technologies
- Identified risks
- Stakeholder feedback

## Related Documents

- [Technical Security](./TECHNICAL_SECURITY.md)
- [FERPA Compliance](./FERPA_COMPLIANCE.md)
- [Personnel Security](./PERSONNEL_SECURITY.md)

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2025 | Initial release | [Your Team] |
