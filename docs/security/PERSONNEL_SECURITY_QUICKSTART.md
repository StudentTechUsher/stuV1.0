# Personnel Security Quick Start Guide

**Purpose:** Get your personnel security program up and running quickly

## Overview

This guide walks you through implementing the Personnel Security requirements from the PTAC Data Security Checklist. Follow these steps in order.

---

## Phase 1: Set Up Infrastructure (Week 1)

### Step 1: Create Compliance Folder Storage

**Time:** 1-2 hours

1. **Set up Google Workspace Shared Drive** (recommended)
   - Create shared drive: "Stu - Compliance Records"
   - Limit access to: CEO, Security Officer, HR Manager only
   - Enable 2FA for all users
   - Enable audit logging

2. **Create folder structure**
   - Follow the structure in [Compliance Folder Setup Guide](./COMPLIANCE_FOLDER_SETUP.md)
   - Key folders: personnel/, audits/, incidents/, university-agreements/

3. **Set up backups**
   - Configure Google Workspace backup settings
   - Create encrypted local backup (monthly)

**Deliverable:** ✅ Secure compliance folder ready to use

---

### Step 2: Create Tracking Systems

**Time:** 2-3 hours

1. **Create Training Tracker spreadsheet**
   - Copy template from [Training Tracker Template](./templates/TRAINING_TRACKER_TEMPLATE.md)
   - Create in: compliance-folder/personnel/training-records/training-tracker.xlsx
   - Set up conditional formatting for expiration dates
   - Create monthly reminder to check

2. **Create Access Request Log**
   - Create spreadsheet: compliance-folder/personnel/access-requests/access-log.xlsx
   - Columns: Request Date, Employee, Tier, Justification, Approver, Decision, Date

3. **Create Incident Log**
   - Create spreadsheet: compliance-folder/incidents/incident-log.xlsx
   - Columns: Date, Type, Severity, Reporter, Description, Resolution, Status

**Deliverable:** ✅ Tracking systems ready for use

---

## Phase 2: Prepare Documents (Week 1-2)

### Step 3: Customize Templates

**Time:** 3-4 hours (including legal review)

1. **Review templates in [templates/](./templates/):**
   - Acceptable Use Policy
   - Employee Confidentiality Agreement
   - Training Tracker structure

2. **Customize for your company:**
   - Replace `[Company Name]` with actual company name
   - Add contact information
   - Add company logo if desired
   - Review each policy for accuracy

3. **Legal review (IMPORTANT):**
   - Have attorney review AUP
   - Have attorney review Confidentiality Agreement
   - Ensure compliance with state employment laws
   - Get written approval to use

**Deliverable:** ✅ Finalized, legally-reviewed policy documents

---

## Phase 3: Current Employee Compliance (Weeks 2-4)

### Step 4: Existing Employees - Immediate Actions

**Time:** Varies by employee count

For EACH existing employee who accesses student data:

1. **Immediate (This Week):**
   - [ ] Enroll in FERPA training: https://studentprivacy.ed.gov/content/online-training-modules
   - [ ] Set deadline: Complete within 7 days
   - [ ] Track in training tracker

2. **Within 2 Weeks:**
   - [ ] Complete FERPA training
   - [ ] Download completion certificate
   - [ ] File certificate in: compliance-folder/personnel/training-records/certificates/
   - [ ] Sign Confidentiality Agreement
   - [ ] Sign AUP acknowledgment
   - [ ] File signed agreements in: compliance-folder/personnel/confidentiality-agreements/active-employees/

3. **Within 4 Weeks (if Tier 2+ access):**
   - [ ] Initiate background check
   - [ ] Store confirmation in: compliance-folder/personnel/background-checks/active-employees/
   - [ ] Update training tracker with all dates

4. **Document Access:**
   - [ ] For each employee, log current access tier
   - [ ] Document in access request log (retroactive approval)
   - [ ] Verify access matches job role

**Deliverable:** ✅ All current employees compliant with training and agreements

---

## Phase 4: New Employee Process (Ongoing)

### Step 5: Create Onboarding Workflow

**Time:** 2 hours to document process

Create a checklist for HR/hiring manager:

**Before Start Date:**
- [ ] Initiate background check (if Tier 2+ role)
- [ ] Prepare confidentiality agreement for signature

**Day 1:**
- [ ] Employee signs confidentiality agreement
- [ ] Employee signs AUP acknowledgment
- [ ] Enroll employee in FERPA training
- [ ] Provide training deadline (within first week)
- [ ] File signed documents in compliance folder
- [ ] Add to training tracker

**Before Granting Data Access:**
- [ ] Verify FERPA training complete
- [ ] Verify certificate on file
- [ ] Verify background check complete (Tier 2+)
- [ ] Verify all agreements signed
- [ ] Manager submits access request with tier justification
- [ ] Security Officer approves
- [ ] IT provisions access at approved tier
- [ ] Log in access tracker

**First Week:**
- [ ] Complete security awareness training
- [ ] Complete system-specific training
- [ ] Review incident reporting procedures

**Deliverable:** ✅ New employee onboarding checklist

---

## Phase 5: Ongoing Maintenance (Monthly/Quarterly/Annual)

### Step 6: Set Up Recurring Tasks

**Time:** 1 hour to set up calendar reminders

**Monthly Tasks:**
- [ ] Review training tracker for training due in 30-60 days
- [ ] Send reminders to employees
- [ ] File new training certificates
- [ ] Review new access requests

**Quarterly Tasks:**
- [ ] Access recertification: Review all employee access tiers
- [ ] Verify access matches current job roles
- [ ] Revoke unnecessary access
- [ ] Review access logs for anomalies
- [ ] Backup compliance folder

**Annual Tasks:**
- [ ] Verify ALL employees completed annual FERPA refresher
- [ ] Collect and file all certificates
- [ ] Update training tracker
- [ ] Review and update policies
- [ ] Annual compliance self-audit

**Set up calendar reminders NOW:**
- Monthly: 1st of each month
- Quarterly: Jan 1, Apr 1, Jul 1, Oct 1
- Annual: January 15

**Deliverable:** ✅ Automated reminders for compliance tasks

---

## Phase 6: Audit Readiness (Ongoing)

### Step 7: Prepare for Audits

**Time:** Ongoing

Keep these documents ready for university auditors:

**Policy Documentation:**
- [Personnel Security Policy](./PERSONNEL_SECURITY.md)
- [FERPA Compliance Guide](./FERPA_COMPLIANCE.md)
- [Acceptable Use Policy](./templates/ACCEPTABLE_USE_POLICY.md)

**Evidence of Compliance:**
- Training tracker showing all employees current
- Training certificates on file
- Signed confidentiality agreements
- Background check confirmations (Tier 2+)
- Access request approvals
- Quarterly access reviews

**Monthly Audit Prep Checklist:**
- [ ] All training is current (no expired)
- [ ] All new employees have signed agreements
- [ ] All certificates filed properly
- [ ] Access tiers match job roles
- [ ] No outstanding access requests
- [ ] Incident log is up to date

**Deliverable:** ✅ Audit-ready compliance documentation

---

## Implementation Checklist Summary

Use this as your master checklist:

### Week 1
- [ ] Set up compliance folder (Google Drive or equivalent)
- [ ] Create folder structure
- [ ] Create training tracker spreadsheet
- [ ] Create access request log
- [ ] Create incident log
- [ ] Review policy templates

### Week 2
- [ ] Customize templates with company info
- [ ] Legal review of policies
- [ ] Finalize policy documents
- [ ] Enroll all current employees in FERPA training
- [ ] Send training deadline reminder

### Week 3
- [ ] Collect completed training certificates
- [ ] File certificates in compliance folder
- [ ] All employees sign confidentiality agreements
- [ ] All employees sign AUP
- [ ] File signed agreements
- [ ] Update training tracker

### Week 4
- [ ] Initiate background checks (Tier 2+ employees)
- [ ] Document all current access in access log
- [ ] Review access tiers vs. job roles
- [ ] Revoke any unnecessary access
- [ ] Complete first compliance audit

### Week 5+
- [ ] Create new employee onboarding checklist
- [ ] Set up monthly/quarterly/annual calendar reminders
- [ ] Train HR on new employee process
- [ ] Document everything
- [ ] You're compliant! 🎉

---

## Key Resources

### Required Training
- **FERPA Training:** https://studentprivacy.ed.gov/content/online-training-modules
- **Modules to complete:** All available FERPA modules
- **Frequency:** Initial + Annual refresher

### Documentation
- [Personnel Security Policy](./PERSONNEL_SECURITY.md) - Full policy details
- [Compliance Folder Setup](./COMPLIANCE_FOLDER_SETUP.md) - Detailed setup instructions
- [Templates Folder](./templates/) - All policy templates
- [FERPA Compliance Guide](./FERPA_COMPLIANCE.md) - FERPA-specific requirements

### Tracking Tools
- Training Tracker - Track all FERPA training
- Access Request Log - Document all access approvals
- Incident Log - Track security incidents

---

## Success Metrics

You've successfully implemented personnel security when:

✅ **All employees with data access have:**
- [ ] Completed FERPA training before access granted
- [ ] Current annual training (not expired)
- [ ] Signed confidentiality agreement on file
- [ ] Signed AUP on file
- [ ] Background check complete (Tier 2+)

✅ **Ongoing compliance:**
- [ ] Training tracker is current and maintained
- [ ] Monthly reviews happening
- [ ] Quarterly access reviews happening
- [ ] New employee process documented
- [ ] All documents stored securely

✅ **Audit readiness:**
- [ ] Can produce training records for any employee
- [ ] Can demonstrate access approvals
- [ ] Can show regular compliance reviews
- [ ] Can demonstrate timely access revocation

---

## Common Mistakes to Avoid

❌ **Don't:**
- Store compliance records in git repository
- Grant access before training is complete
- Skip background checks for Tier 2+ access
- Forget to file training certificates
- Skip quarterly access reviews
- Let training expire without renewal

✅ **Do:**
- Store records in secure, separate location
- Verify all requirements before granting access
- Track everything in spreadsheets
- Set up calendar reminders
- Review access regularly
- Be audit-ready at all times

---

## Getting Help

**Questions about:**
- **FERPA requirements:** Check [FERPA Compliance Guide](./FERPA_COMPLIANCE.md)
- **Access tiers:** See [Personnel Security Policy](./PERSONNEL_SECURITY.md#database-access-tiers)
- **Storage setup:** See [Compliance Folder Setup](./COMPLIANCE_FOLDER_SETUP.md)
- **Policy templates:** See [templates/README.md](./templates/README.md)

**Technical Support:**
- Security Team: security@[company].com
- HR Team: hr@[company].com

---

## What's Next?

Once you've completed personnel security:

1. Review other PTAC checklist items:
   - [Technical Security](./TECHNICAL_SECURITY.md)
   - [Data Governance](./DATA_GOVERNANCE.md)
   - [Incident Response](./INCIDENT_RESPONSE.md)

2. Consider additional security measures:
   - SOC 2 compliance
   - External security audit
   - Penetration testing

3. Continuous improvement:
   - Review policies annually
   - Update based on lessons learned
   - Stay current with FERPA changes

---

**Last Updated:** December 2025
**Next Review:** Quarterly
