'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Brain,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Loader2,
  Sparkles,
  Trash2,
  Save,
  Eye,
  Tag,
  Scale,
  Building2,
  Hash,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface AnalysisResult {
  textract: {
    extracted_chars: number;
    filename: string;
    preview: string;
    error?: string;
  } | null;
  bedrock: {
    isComplianceNotice: boolean;
    complianceType: string;
    complianceCategory: string;
    issuingAuthority: string;
    referenceNumber: string;
    subject: string;
    summary: string;
    deadlines: Array<{ date: string; type: string; description: string }>;
    requiredActions: string[];
    penalties: { amount: number; currency: string; description: string } | null;
    applicableRegulations: string[];
    keywords: string[];
    riskLevel: string;
    riskJustification: string;
    error?: string;
  } | null;
  comprehend: {
    entities: Array<{ text: string; type: string; score: number }>;
    key_phrases: string[];
    error?: string;
  } | null;
  saved: boolean;
  notice_id?: string;
}

const SAMPLE_NOTICES: Record<string, { label: string; text: string }> = {
  gst: {
    label: 'GST Return Filing Notice',
    text: `Subject: GST Return Filing Notice - GSTIN 29ABCDE1234F1Z5

From: Central Board of Indirect Taxes and Customs (CBIC)
Reference No: GST/NOT/2024/0847

Dear Taxpayer,

This is to inform you that your GST Return (GSTR-3B) for the period October 2024 has not been filed within the prescribed due date of 20th November 2024.

As per Section 46 of the CGST Act, 2017, you are required to file the return within 15 days from the date of this notice, failing which a penalty of ₹50 per day (₹25 CGST + ₹25 SGST) shall be levied under Section 47, subject to a maximum of ₹10,000.

Additionally, your Input Tax Credit (ITC) claims for subsequent periods may be suspended under Rule 36(4) of CGST Rules until the return is filed.

Required Actions:
1. File GSTR-3B for October 2024 on the GST portal (gst.gov.in)
2. Pay applicable late fees and interest under Section 50 at 18% per annum
3. Submit proof of filing to this office within 7 days

Deadline: 15th December 2024

Non-compliance may result in assessment proceedings under Section 62 and recovery actions under Section 79 of the CGST Act.

This notice is issued under Section 46 read with Rule 68 of the CGST Rules, 2017.

Issued by:
Assistant Commissioner, CGST Division-IV
Bengaluru, Karnataka
Date: 30th November 2024`,
  },
  income_tax: {
    label: 'Income Tax Scrutiny Notice',
    text: `OFFICE OF THE ASSISTANT COMMISSIONER OF INCOME TAX
CIRCLE 1(1), NEW DELHI

NOTICE UNDER SECTION 143(2) OF THE INCOME TAX ACT, 1961

To: M/s TechSolutions Pvt Ltd
PAN: AABCT1234E
Assessment Year: 2023-24
Reference No: ACIT/C-1(1)/143(2)/2024-25/1287

Sir/Madam,

Whereas a return of income for the Assessment Year 2023-24 was filed by you on 31st October 2023 declaring a total income of ₹2,45,67,890/-, the same has been selected for scrutiny assessment.

You are hereby required to attend this office on 20th January 2025 at 11:00 AM or cause to produce the following documents/information:

1. Books of accounts including cash book, ledger, and journal for FY 2022-23
2. Bank statements for all accounts maintained during FY 2022-23
3. Details of all TDS certificates (Form 16A/26AS reconciliation)
4. Supporting documents for deductions claimed under Section 80C, 80D, 80G
5. Details of foreign remittances (Form 15CA/15CB) if any
6. Invoices and contracts for major transactions exceeding ₹10,00,000

IMPORTANT: Under Section 271(1)(b), failure to comply with this notice may attract a penalty of ₹10,000 for each default. Additionally, if the assessee fails to comply, the assessment may be completed to the best of judgment under Section 144.

The notice is being issued as per the Risk Management Strategy of the CBDT and the guidelines issued vide Instruction No. 1/2023 dated 15th March 2023.

Deadline for compliance: 20th January 2025

(Authorized Signatory)
Assistant Commissioner of Income Tax
Circle 1(1), New Delhi
Date: 15th December 2024
DIN: ITBA/AST/F/143(2)/2024-25/1042876543`,
  },
  mca: {
    label: 'MCA Annual Filing Notice',
    text: `MINISTRY OF CORPORATE AFFAIRS
REGISTRAR OF COMPANIES, MUMBAI

NOTICE FOR NON-FILING OF ANNUAL RETURNS
Under Section 403 read with Section 92 and 137 of the Companies Act, 2013

CIN: U72200MH2019PTC123456
Company Name: InnovateTech Solutions Private Limited
Registered Office: 401, Business Park, Andheri East, Mumbai - 400093

Notice Reference: ROC/MUM/STK-7/2024/NON-COMP/4521

Dear Sir/Madam,

It has come to the notice of this office that the following statutory filings are pending for your company:

1. AOC-4 (Financial Statements) for FY 2023-24 - Due Date: 30th October 2024 (OVERDUE)
2. MGT-7A (Annual Return) for FY 2023-24 - Due Date: 28th November 2024 (OVERDUE)
3. ADT-1 (Auditor Appointment) - Not filed

As per Section 403 of the Companies Act, 2013, an additional fee of ₹100 per day is applicable for each form beyond the due date. The current accumulated additional fees as on date are approximately ₹12,600 for AOC-4 and ₹4,200 for MGT-7A.

CONSEQUENCES OF CONTINUED NON-COMPLIANCE:
- The company may be marked for strike-off under Section 248(1)(c)
- Directors may be disqualified under Section 164(2)
- Prosecution proceedings under Section 92(5) and 137(3) with fine up to ₹5,00,000

Required Actions:
1. File AOC-4 with audited financial statements immediately
2. File MGT-7A Annual Return within 15 days of this notice
3. File ADT-1 for auditor appointment/re-appointment
4. Pay all applicable additional fees through MCA portal (mca.gov.in)

Final Deadline: 31st January 2025

Failure to comply will result in initiation of strike-off proceedings and prosecution.

Sd/-
Registrar of Companies, Mumbai
Ministry of Corporate Affairs
Date: 10th December 2024`,
  },
  labour: {
    label: 'EPFO Compliance Notice',
    text: `EMPLOYEES' PROVIDENT FUND ORGANISATION
(Ministry of Labour & Employment, Govt. of India)
REGIONAL OFFICE, BENGALURU

NOTICE UNDER SECTION 7A OF THE EPF & MP ACT, 1952

Establishment Code: KA/BLR/12345
Establishment Name: CloudServe Technologies Pvt Ltd
Address: 3rd Floor, Tech Tower, Whitefield, Bengaluru - 560066

Reference No: EPFO/KA/BLR/7A/2024/892

Sir/Madam,

During the inspection conducted on 25th November 2024, the following irregularities have been observed in the PF compliance of your establishment:

1. DELAYED REMITTANCE: EPF contributions for September 2024 (₹4,23,890) and October 2024 (₹4,56,120) were remitted with a delay of 18 days and 12 days respectively. Under Section 7Q, interest at the rate of 12% p.a. is applicable on delayed payments.

2. NON-ENROLLMENT: 12 employees who joined after 01st April 2024 with basic wages below ₹15,000/month have not been enrolled under the EPF scheme, in violation of Section 2(f) read with Para 26A of the EPF Scheme.

3. WAGE DISCREPANCY: The PF contributions for 8 employees are being deposited on basic wages lower than their actual drawn basic wages as per payroll records.

Total estimated dues including interest and damages: ₹3,87,650

PENALTY: Under Section 14B of the EPF Act, damages up to 100% of the arrears may be levied. Additionally, prosecution under Section 14 may result in imprisonment up to 3 years and fine up to ₹10,000.

Required Actions:
1. Deposit arrears of ₹3,87,650 within 15 days
2. Enroll all eligible employees immediately
3. Submit revised ECR for affected months
4. Appear before the undersigned on 10th January 2025 at 11:30 AM with all payroll records

Deadline: 10th January 2025

(Authorized Officer)
Regional Provident Fund Commissioner
EPFO Regional Office, Bengaluru
Date: 5th December 2024`,
  },
};

export default function AnalyzePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveOnAnalyze, setSaveOnAnalyze] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  async function handleAnalyze() {
    if (!text && !file) {
      setError('Please enter text or upload a document to analyze.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        text: text || '',
        save: saveOnAnalyze,
      };

      if (file) {
        const arrayBuf = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        body.attachment = base64;
        body.filename = file.name;
      }

      const res = await fetch(`${API_URL}/test/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'demo-user',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `API returned ${res.status}`);
      }
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  }

  function loadSample(key?: string) {
    const sampleKey = key || 'gst';
    setText(SAMPLE_NOTICES[sampleKey]?.text || SAMPLE_NOTICES.gst.text);
    setFile(null);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setText('');
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setFile(selected);
      setError(null);
    }
  }

  const riskColors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-800 border-red-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Low: 'bg-green-100 text-green-800 border-green-200',
  };

  const bedrock = result?.bedrock;
  const comprehend = result?.comprehend;
  const textract = result?.textract;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary-600" />
              AI Document Analyzer
            </h1>
            <p className="text-gray-500 mt-1">
              Analyze compliance notices using Amazon Bedrock (Nova Pro), Textract &amp; Comprehend
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Input</h2>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(SAMPLE_NOTICES).map(([key, sample]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => loadSample(key)}
                  className="px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {sample.label}
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a government compliance notice, email body, or any text to analyze..."
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-y"
          />

          {/* File Upload */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">Upload PDF / Image</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {file && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          {/* Save toggle + Analyze button */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveOnAnalyze}
                onChange={(e) => setSaveOnAnalyze(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Save className="h-4 w-4" />
              Save result as compliance notice
            </label>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || (!text && !file)}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  Analyze with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading Animation */}
        {analyzing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Brain className="h-12 w-12 text-primary-600 animate-pulse" />
                <Sparkles className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">AI Analysis in Progress</p>
                <p className="text-sm text-gray-500 mt-1">
                  Running Textract → Bedrock Nova Pro → Comprehend pipeline...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !analyzing && (
          <div className="space-y-6">
            {/* Bedrock AI Analysis */}
            {bedrock && !bedrock.error && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary-600" />
                      Bedrock AI Analysis
                    </h2>
                    <div className="flex gap-2">
                      {bedrock.isComplianceNotice ? (
                        <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Compliance Notice
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                          Not a Compliance Notice
                        </span>
                      )}
                      {bedrock.riskLevel && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${riskColors[bedrock.riskLevel] || 'bg-gray-100 text-gray-800'}`}>
                          {bedrock.riskLevel} Risk
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Top info grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem icon={<Scale className="h-4 w-4" />} label="Type" value={bedrock.complianceType} />
                    <InfoItem icon={<Tag className="h-4 w-4" />} label="Category" value={bedrock.complianceCategory} />
                    <InfoItem icon={<Building2 className="h-4 w-4" />} label="Issuing Authority" value={bedrock.issuingAuthority} />
                    <InfoItem icon={<Hash className="h-4 w-4" />} label="Reference No." value={bedrock.referenceNumber} />
                  </div>

                  {/* Subject & Summary */}
                  {bedrock.subject && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Subject</p>
                      <p className="text-gray-900 font-medium mt-1">{bedrock.subject}</p>
                    </div>
                  )}
                  {bedrock.summary && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-700 mb-1">AI Summary</p>
                      <p className="text-sm text-blue-900">{bedrock.summary}</p>
                    </div>
                  )}

                  {/* Risk Justification */}
                  {bedrock.riskJustification && (
                    <div className={`rounded-lg p-4 ${bedrock.riskLevel === 'Critical' || bedrock.riskLevel === 'High' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                      <p className={`text-sm font-medium mb-1 ${bedrock.riskLevel === 'Critical' || bedrock.riskLevel === 'High' ? 'text-red-700' : 'text-yellow-700'}`}>
                        Risk Assessment
                      </p>
                      <p className={`text-sm ${bedrock.riskLevel === 'Critical' || bedrock.riskLevel === 'High' ? 'text-red-900' : 'text-yellow-900'}`}>
                        {bedrock.riskJustification}
                      </p>
                    </div>
                  )}

                  {/* Deadlines */}
                  {bedrock.deadlines && bedrock.deadlines.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Deadlines
                      </p>
                      <div className="space-y-2">
                        {bedrock.deadlines.map((d, i) => (
                          <div key={i} className="flex items-center gap-3 bg-orange-50 rounded-lg p-3">
                            <span className="text-xs font-semibold text-orange-700 bg-orange-100 rounded px-2 py-0.5 uppercase">
                              {d.type}
                            </span>
                            <span className="text-sm font-mono text-orange-900">{d.date}</span>
                            <span className="text-sm text-orange-800">{d.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Required Actions */}
                  {bedrock.requiredActions && bedrock.requiredActions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Required Actions
                      </p>
                      <ul className="space-y-1">
                        {bedrock.requiredActions.map((action, i) => (
                          <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                            <span className="text-primary-600 font-bold mt-0.5">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Penalties */}
                  {bedrock.penalties && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Penalties
                      </p>
                      <p className="text-sm text-red-900">
                        {bedrock.penalties.currency} {bedrock.penalties.amount?.toLocaleString()} — {bedrock.penalties.description}
                      </p>
                    </div>
                  )}

                  {/* Regulations */}
                  {bedrock.applicableRegulations && bedrock.applicableRegulations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Applicable Regulations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bedrock.applicableRegulations.map((reg, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                            {reg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {bedrock.keywords && bedrock.keywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bedrock.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bedrock Error */}
            {bedrock?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium text-sm">Bedrock Analysis Error</p>
                  <p className="text-red-700 text-sm mt-1">{bedrock.error}</p>
                </div>
              </div>
            )}

            {/* Textract Results */}
            {textract && !textract.error && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Textract OCR Results
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">File</p>
                    <p className="text-sm font-medium text-gray-900">{textract.filename}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Extracted Characters</p>
                    <p className="text-sm font-medium text-gray-900">{textract.extracted_chars.toLocaleString()}</p>
                  </div>
                </div>
                {textract.preview && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Text Preview</p>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{textract.preview}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Comprehend Results */}
            {comprehend && !comprehend.error && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Comprehend NLP Results
                </h2>
                {comprehend.entities && comprehend.entities.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Named Entities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {comprehend.entities.map((e, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md" title={`${e.type} (${(e.score * 100).toFixed(0)}%)`}>
                          {e.text} <span className="text-purple-400">({e.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {comprehend.key_phrases && comprehend.key_phrases.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Key Phrases</p>
                    <div className="flex flex-wrap gap-1.5">
                      {comprehend.key_phrases.map((p, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Saved confirmation */}
            {result.saved && result.notice_id && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-green-800 text-sm">
                  Saved as compliance notice <code className="bg-green-100 px-1 rounded text-xs">{result.notice_id}</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) {
    return null;
  }
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      </div>
    </div>
  );
}
