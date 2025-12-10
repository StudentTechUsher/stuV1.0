# Compliance Folder Setup Guide

**Last Updated:** December 2025
**Purpose:** Guide for setting up and maintaining secure storage for FERPA compliance records

## Important: Storage Location

**⚠️ CRITICAL: Store compliance records OUTSIDE of your git repository**

Compliance records contain sensitive employee information and must be stored securely and separately from your codebase.

## Recommended Storage Solution

### Option 1: Google Workspace (Recommended for Startups)

**Why Google Workspace:**
- Built-in encryption at rest and in transit
- Granular access controls
- Audit logging included
- Easy to share with HR/Security team only
- Automatic backups
- Meets compliance requirements
- Cost-effective for startups

**Setup Steps:**

1. **Create Dedicated Shared Drive**
   - Name: "Stu - Compliance Records"
   - Access: Restricted to HR Manager, Security Officer, CEO only
   - Settings:
     - ✅ Enable "Prevent editors from changing access"
     - ✅ Enable "Disable download, print, and copy for viewers"
     - ✅ Enable audit logging

2. **Create Folder Structure:**

```
Stu - Compliance Records/
├── README.txt (instructions for access)
├── personnel/
│   ├── training-records/
│   │   ├── training-tracker.xlsx (main tracking spreadsheet)
│   │   ├── certificates/
│   │   │   ├── 2025/
│   │   │   │   ├── john-doe-ferpa-2025-01-15.pdf
│   │   │   │   └── jane-smith-ferpa-2025-02-01.pdf
│   │   │   └── archive/
│   │   └── training-reminders/
│   ├── background-checks/
│   │   ├── active-employees/
│   │   └── archive/
│   ├── confidentiality-agreements/
│   │   ├── active-employees/
│   │   │   ├── john-doe-nda-signed-2025-01-10.pdf
│   │   │   └── john-doe-aup-signed-2025-01-10.pdf
│   │   └── archive/
│   └── access-requests/
│       ├── approved/
│       └── denied/
├── audits/
│   ├── internal-audits/
│   │   ├── 2025-Q1-internal-audit.pdf
│   │   └── audit-findings-tracker.xlsx
│   ├── external-audits/
│   └── remediation-plans/
├── incidents/
│   ├── incident-reports/
│   │   └── incident-log.xlsx
│   ├── breach-notifications/
│   └── investigations/
├── university-agreements/
│   ├── data-processing-agreements/
│   │   ├── university-name-dpa-signed.pdf
│   │   └── dpa-tracker.xlsx
│   ├── security-assessments/
│   └── audit-reports-shared/
└── policies/
    ├── current-versions/
    └── archived-versions/
```

3. **Set Permissions:**

| Folder | HR Manager | Security Officer | CEO | Data Analyst | Consultant |
|--------|-----------|------------------|-----|--------------|------------|
| Root folder | Full Access | Full Access | Full Access | No Access | No Access |
| personnel/ | Full Access | View Only | Full Access | No Access | No Access |
| audits/ | View Only | Full Access | Full Access | No Access | No Access |
| incidents/ | View Only | Full Access | Full Access | No Access | No Access |
| university-agreements/ | View Only | View Only | Full Access | No Access | No Access |

4. **Enable Security Features:**
   - ✅ Turn on 2-Factor Authentication for all users with access
   - ✅ Enable "Access Checker" to review permissions monthly
   - ✅ Set up alerts for file sharing/downloading
   - ✅ Enable version history (keep all versions)
   - ✅ Set up Data Loss Prevention (DLP) rules if available

### Option 2: Microsoft OneDrive/SharePoint

Similar setup to Google Workspace:
- Create SharePoint site or OneDrive shared folder
- Implement same folder structure
- Configure access controls via SharePoint permissions
- Enable auditing and alerts

### Option 3: Encrypted Local Storage (Backup Only)

**Only use as secondary backup, not primary storage:**

```bash
# Create encrypted disk image (macOS)
/Users/[username]/Stu-Compliance-Backup/
```

- Use FileVault (macOS) or BitLocker (Windows)
- Regular encrypted backups to external drive
- Keep separate from code repositories
- NOT recommended as primary storage

## Essential Files to Create

### 1. Training Tracker (training-tracker.xlsx)

Create spreadsheet with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Employee Name | Full legal name | John Doe |
| Employee ID | Internal ID | EMP001 |
| Email | Work email | john@company.com |
| Role | Job title | Senior Consultant |
| Access Tier | Tier 0-4 | Tier 4 |
| FERPA Training Date | Initial training completion | 2025-01-15 |
| FERPA Next Due | Annual refresher due | 2026-01-15 |
| Certificate Location | Path to PDF | /certificates/2025/john-doe-ferpa-2025-01-15.pdf |
| Background Check Date | Completion date | 2025-01-10 |
| NDA Signed Date | Agreement signed | 2025-01-10 |
| AUP Signed Date | AUP acknowledged | 2025-01-10 |
| Status | Active/Inactive | Active |
| Notes | Additional info | Completed all requirements |

**Add conditional formatting:**
- Red: Training overdue
- Yellow: Training due in < 30 days
- Green: Training current

### 2. Incident Log (incidents/incident-log.xlsx)

| Date | Incident Type | Severity | Reporter | Description | Resolution | Status |
|------|--------------|----------|----------|-------------|------------|--------|
| 2025-03-15 | Phishing Email | Minor | Jane Smith | Employee clicked suspicious link | Password reset, additional training | Closed |

### 3. Access Request Log (personnel/access-requests/access-log.xlsx)

| Request Date | Employee | Requested Tier | Justification | Approver | Decision | Decision Date | Notes |
|--------------|----------|---------------|---------------|----------|----------|---------------|-------|
| 2025-01-10 | John Doe | Tier 4 | Consulting role requires DB access | Security Officer | Approved | 2025-01-12 | All requirements met |

## Maintenance Schedule

### Daily
- Monitor for new access requests
- Review incident reports

### Weekly
- Check for new training certificates to file
- Review access logs for anomalies

### Monthly
- Review training due dates
- Send reminders for training due in 30-60 days
- Review folder access permissions
- Check backup integrity

### Quarterly
- Conduct access recertification
- Review all active access against current roles
- Archive records of departed employees
- Update policies if needed
- Internal compliance audit

### Annually
- Verify all employees completed annual FERPA refresher
- Review and update all templates
- Comprehensive security review
- External audit (if applicable)

## Access Management

### Who Should Have Access

**Full Access (Read/Write):**
- HR Manager
- Security Officer / FERPA Compliance Officer
- CEO/Founder

**View Only Access:**
- Legal counsel (if applicable)
- External auditors (time-limited during audits)

**No Access:**
- All other employees (including consultants, data analysts, etc.)
- Contractors and vendors
- University partners (except during audits)

### Granting Access

1. **Request:** Must be in writing (email) with justification
2. **Approval:** Requires CEO or Security Officer approval
3. **Time-Limited:** Set expiration date for temporary access
4. **MFA Required:** Enable 2FA before granting access
5. **Document:** Log all access grants in access log

### Revoking Access

**Immediate revocation when:**
- Employee leaves company
- Role changes (no longer needs access)
- Security incident involving that user
- End of temporary access period

## Backup Strategy

### Primary Storage: Google Workspace
- Automatic Google backups
- Verify backup settings enabled

### Secondary Backup: Encrypted Local Drive
- **Frequency:** Monthly full backup
- **Method:** Download entire folder, encrypt, store on external drive
- **Location:** Secure location (safe, locked drawer)
- **Retention:** Keep last 3 monthly backups

### Tertiary Backup: Offsite
- **Frequency:** Quarterly
- **Method:** Encrypted backup to separate cloud service or physical offsite location
- **Retention:** Annual backups kept indefinitely

## Audit Readiness

Your compliance folder should be ready to demonstrate:

✅ **All employees with data access have:**
- Completed FERPA training before access granted
- Signed confidentiality agreements
- Passed background checks (Tier 2+)
- Current annual training (not expired)

✅ **Training records show:**
- Training completion dates
- Certificate storage locations
- Next training due dates
- Tracking system in place

✅ **Access controls demonstrate:**
- Access granted based on role
- Least privilege principle followed
- Quarterly access reviews conducted
- Prompt access revocation upon departure

✅ **Incident management shows:**
- All incidents documented
- Response times tracked
- Resolutions implemented
- Lessons learned documented

## Initial Setup Checklist

- [ ] Create Google Shared Drive or equivalent secure storage
- [ ] Set up folder structure as outlined above
- [ ] Configure access controls (HR, Security, CEO only)
- [ ] Enable 2FA for all users with access
- [ ] Create training tracker spreadsheet
- [ ] Create incident log spreadsheet
- [ ] Create access request log
- [ ] Copy policy templates from `/docs/security/templates/`
- [ ] Set up automatic backup schedule
- [ ] Document access procedures in README
- [ ] Set calendar reminders for quarterly reviews
- [ ] Add to .gitignore if folder is anywhere near repo
- [ ] Test restore from backup

## What NOT to Store Here

❌ **Do NOT store:**
- Source code or technical documentation (keep in git repo)
- University student data (belongs in university's database only)
- API keys or credentials (use secrets management)
- Public-facing documentation (keep in docs/ folder in repo)

✅ **DO store:**
- Employee training records
- Signed confidentiality agreements
- Background check confirmations
- Audit reports
- Incident reports
- Signed data processing agreements
- Internal compliance documentation

## Retention Policies

| Document Type | Retention Period |
|--------------|------------------|
| Training certificates | Duration of employment + 3 years |
| Background checks | Duration of employment + 7 years |
| Confidentiality agreements | Duration of employment + 7 years |
| Incident reports | 7 years minimum |
| Audit reports | 7 years minimum |
| Data processing agreements | Duration of contract + 7 years |
| Access logs | 3 years |

## Security Checklist

- [ ] Storage location is encrypted
- [ ] Access is limited to authorized personnel only
- [ ] 2FA enabled for all users with access
- [ ] Audit logging enabled
- [ ] Backups are encrypted
- [ ] Backups are tested regularly
- [ ] Access is reviewed quarterly
- [ ] No links or sharing outside organization
- [ ] Location is NOT in git repository
- [ ] Location is NOT on public cloud without access controls

## Related Documentation

- [Personnel Security Policy](./PERSONNEL_SECURITY.md)
- [FERPA Compliance Guide](./FERPA_COMPLIANCE.md)
- [Audit & Compliance](./AUDIT_COMPLIANCE.md)
- [Data Governance](./DATA_GOVERNANCE.md)

## Questions?

Contact:
- **Security Officer:** [email]
- **HR Manager:** [email]
- **CEO:** [email]
