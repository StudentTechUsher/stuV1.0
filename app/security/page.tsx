import { Metadata } from 'next';
import SecurityDocViewer from './components/SecurityDocViewer';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export const metadata: Metadata = {
  title: 'Security Documentation | Stu',
  description: 'Comprehensive security and FERPA compliance documentation for university review and auditing',
};

interface SecurityDoc {
  id: string;
  title: string;
  description: string;
  filename: string;
  content: string;
  category: 'core' | 'compliance' | 'procedures';
}

const DOCS_DIR = join(process.cwd(), 'docs', 'security');

const DOC_METADATA: Record<string, { title: string; description: string; category: SecurityDoc['category'] }> = {
  'SECURITY_OVERVIEW.md': {
    title: 'Security Overview',
    description: 'High-level security summary, architecture, and quick reference',
    category: 'core',
  },
  'TECHNICAL_SECURITY.md': {
    title: 'Technical Security Measures',
    description: 'Detailed technical controls including authentication, encryption, and access control',
    category: 'core',
  },
  'DATA_GOVERNANCE.md': {
    title: 'Data Governance',
    description: 'Data management policies, classification, retention, and sharing principles',
    category: 'core',
  },
  'FERPA_COMPLIANCE.md': {
    title: 'FERPA Compliance',
    description: 'Comprehensive FERPA compliance documentation and student rights implementation',
    category: 'compliance',
  },
  'PERSONNEL_SECURITY.md': {
    title: 'Personnel Security',
    description: 'Personnel policies including background checks, training, and acceptable use',
    category: 'procedures',
  },
  'INCIDENT_RESPONSE.md': {
    title: 'Incident Response Plan',
    description: 'Security incident procedures, breach notification, and communication protocols',
    category: 'procedures',
  },
  'AUDIT_COMPLIANCE.md': {
    title: 'Audit & Compliance',
    description: 'Audit procedures, compliance monitoring, and university audit rights',
    category: 'compliance',
  },
  'SECURITY_UPDATES.md': {
    title: 'Security Updates & Patch History',
    description: 'Vulnerability response timeline, patch management, and security incident history',
    category: 'compliance',
  },
};

function getSecurityDocs(): SecurityDoc[] {
  const files = readdirSync(DOCS_DIR);
  const mdFiles = files.filter(file => file.endsWith('.md') && file !== 'README.md');

  return mdFiles
    .map(filename => {
      const content = readFileSync(join(DOCS_DIR, filename), 'utf-8');
      const metadata = DOC_METADATA[filename];

      if (!metadata) {
        return null;
      }

      return {
        id: filename.replace('.md', '').toLowerCase(),
        title: metadata.title,
        description: metadata.description,
        filename,
        content,
        category: metadata.category,
      };
    })
    .filter((doc): doc is SecurityDoc => doc !== null)
    .sort((a, b) => {
      // Sort by category, then by title
      const categoryOrder = { core: 0, compliance: 1, procedures: 2 };
      if (a.category !== b.category) {
        return categoryOrder[a.category] - categoryOrder[b.category];
      }
      return a.title.localeCompare(b.title);
    });
}

export default function SecurityPage() {
  const docs = getSecurityDocs();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Security Documentation
              </h1>
              <p className="text-lg text-gray-600">
                Comprehensive security and FERPA compliance documentation for university review
              </p>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                FERPA Compliant
              </span>
              <span className="text-sm text-gray-500">Last Updated: December 2025</span>
            </div>
          </div>
        </div>
      </header>

      {/* Introduction */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            For University Auditors
          </h2>
          <p className="text-blue-800 mb-4">
            This documentation is provided to assist universities in auditing our security and FERPA compliance practices.
            All documents are available for review without authentication.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Quick Links</h3>
              <ul className="space-y-1 text-blue-700">
                <li>• FERPA Compliance Overview</li>
                <li>• Technical Security Controls</li>
                <li>• Audit Procedures</li>
                <li>• Incident Response Plan</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Contact Information</h3>
              <ul className="space-y-1 text-blue-700">
                <li>Security: security@yourdomain.com</li>
                <li>Audits: audit-requests@yourdomain.com</li>
                <li>24/7 Hotline: [To be filled]</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Highlights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Security Highlights</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">End-to-end Encryption</p>
                <p className="text-gray-600">TLS 1.3 for all communications</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Role-Based Access Control</p>
                <p className="text-gray-600">Strict permission model with RLS</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Comprehensive Logging</p>
                <p className="text-gray-600">All data access is logged and auditable</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Data Encrypted at Rest</p>
                <p className="text-gray-600">AES-256 encryption for all stored data</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">FERPA-Trained Staff</p>
                <p className="text-gray-600">Annual training and certifications</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">Incident Response Plan</p>
                <p className="text-gray-600">24/7 monitoring and response</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document Viewer */}
        <SecurityDocViewer docs={docs} />

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            For audit requests or questions about our security practices, please contact{' '}
            <a href="mailto:audit-requests@yourdomain.com" className="text-blue-600 hover:text-blue-800 underline">
              audit-requests@yourdomain.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
