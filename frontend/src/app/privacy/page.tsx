import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="flex items-center">
            <Shield className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">ComplianceShield</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: March 8, 2026</p>

          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 mb-4">
              ComplianceShield collects information to provide better services to our users. We collect information in the following ways:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li><strong>Google Account Information:</strong> When you sign in with Google, we collect your email address, name, and profile information.</li>
              <li><strong>Gmail Data:</strong> With your explicit consent, we access your Gmail to scan for government compliance notifications. We only read emails, never modify or delete them.</li>
              <li><strong>Usage Data:</strong> We collect information about how you use our service to improve functionality.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Provide AI-powered compliance monitoring services</li>
              <li>Analyze government emails for compliance requirements</li>
              <li>Send you notifications about important compliance deadlines</li>
              <li>Improve our service and develop new features</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Gmail Data Access</h2>
            <p className="text-gray-700 mb-4">
              ComplianceShield requests read-only access to your Gmail account specifically to:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Scan for emails from government agencies and regulatory bodies</li>
              <li>Extract compliance requirements and deadlines</li>
              <li>Provide automated risk assessment and notifications</li>
            </ul>
            <p className="text-gray-700 mb-6">
              <strong>We never:</strong> Modify, delete, or send emails from your account. We only read emails to provide compliance monitoring services.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
            <p className="text-gray-700 mb-6">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest. Your Gmail data is processed securely and never shared with third parties.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Data Sharing</h2>
            <p className="text-gray-700 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties. We may share aggregated, non-personally identifiable information for research and analytics purposes.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
            <p className="text-gray-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-6 text-gray-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Revoke Gmail access permissions at any time</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Contact Us</h2>
            <p className="text-gray-700 mb-6">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              Email: privacy@complianceshield.com
              <br />
              Website: https://complianceshieldai.in
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-700 mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}