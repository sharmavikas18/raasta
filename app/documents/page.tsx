// RAASTA Document Intelligence Page — PRD §7 Flow 2, §14, AT-03, AT-04
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';
import { Icon } from '@/components/ui/Icon';

const SAMPLE_SCHOLARSHIP_TEXT = `GOVERNMENT OF INDIA
DEPARTMENT OF SCIENCE & TECHNOLOGY
NATIONAL MERIT STEM RESEARCH FELLOWSHIP 2026
NOTIFICATION NO. DST/STEM-2026/04

1. OBJECTIVE:
To identify and support high-achieving undergraduate and postgraduate researchers across India.

2. DEADLINE:
Applications must be submitted on the National Scholarship Portal by October 15, 2026 at 23:59 IST.
Hard copies must reach the Secretariat in New Delhi within 5 days of online submission.

3. ELIGIBILITY:
- Full-time enrolled student in an accredited Indian STEM university or institute.
- Minimum 8.5 CGPA or top decile institutional rank in preceding academic year.
- Annual household taxable income strictly below INR 8,00,000.

4. MANDATORY APPLICATION PREREQUISITES & DOCUMENTS:
- Current Financial Year Family Income Certificate issued by Revenue Authority (Sub-Divisional Magistrate / Tehsildar signed).
- Recommendation letter from Faculty Research Supervisor or Dean on institutional letterhead.
- Bonafide Student Enrollment Certificate with seal of the Registrar.
- Aadhaar seeded bank account for DBT authentication.

5. SPECIAL PROVISO (CLAUSE 4.2):
"Holders of state-level tuition assistance or secondary stipends may require a special waiver from the State Directorate before drawing this fellowship."
[Note: Notification does not specify waiver procedure, contact desk, or threshold amount.]

6. OFFICIAL CONTACT:
Department of Science Secretariat, Technology Bhawan, New Delhi.
Official portal: https://scholarships.gov.in/stem2026
Email: nodal@stem-merit.gov.in`;

export default function DocumentsPage() {
  const router = useRouter();
  const [docText, setDocText] = useState(SAMPLE_SCHOLARSHIP_TEXT);
  const [fileName, setFileName] = useState('DST_STEM_Research_Fellowship_Notice_2026.pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [createdJourneyId, setCreatedJourneyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedFile && !docText.trim()) {
      setError('Please provide document text or select sample.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setUploadStatus(null);

    try {
      let s3Key: string | undefined;
      if (selectedFile) {
        setUploadStatus('Saving your PDF privately…');
        const sign = await fetch('/api/documents/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, contentType: selectedFile.type, size: selectedFile.size }),
        });
        const signed = await sign.json();
        if (!sign.ok) {
          // Keep local demo mode resilient when AWS variables are absent.
          if (sign.status === 503) {
            setUploadStatus('AWS is not configured — using the local Bedrock demo…');
            s3Key = undefined;
          } else {
            throw new Error(signed.error || 'Could not prepare private upload.');
          }
        }
        if (!sign.ok && !s3Key) {
          // Continue with the sample/document text path below.
        } else {
          s3Key = signed.key;
        }
        if (sign.ok && signed.mode !== 'mock') {
          const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: selectedFile });
          if (!put.ok) throw new Error('Private PDF upload failed.');
        }
        setUploadStatus('Reading deadline and requirements with Bedrock…');
      }
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: docText,
          fileName: selectedFile?.name || fileName,
          s3Key,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Document extraction failed.');
      }

      const result = await res.json();
      setAnalysisResult(result.extraction);
      setCreatedJourneyId(result.journeyId);
      // The primary action promises a generated journey. Take the user to it
      // immediately instead of leaving the successful result below the long
      // document preview.
      router.push(`/journeys/${result.journeyId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze document.');
    } finally {
      setIsAnalyzing(false);
      setUploadStatus(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 documents-page">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          ● Document Intelligence — Scenario A (PRD §2, §14)
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
          Upload & Analyze Official Circulars
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Upload scholarship notices, conference guidelines, or circulars. RAASTA extracts requirements, deadlines, prerequisite dependencies, and flags ambiguities.
        </p>
      </div>

      {/* Upload / Document Preview Card */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg">
              <Icon name="file" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {fileName}
              </h2>
              <span className="text-[11px] text-zinc-400">
                Sample Scholarship PDF — Gazette Notice format
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDocText(SAMPLE_SCHOLARSHIP_TEXT);
                setFileName('DST_STEM_Research_Fellowship_Notice_2026.pdf');
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50"
            >
              Reset Sample
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing with Bedrock...' : 'Extract & Generate Journey →'}
            </button>
          </div>
        </div>

        <label className="upload-dropzone">
          <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={isAnalyzing}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setSelectedFile(file); if (file) { setFileName(file.name); setError(null); }
            }} />
          <span><Icon name="upload" size={26} /></span>
          <strong>{selectedFile ? selectedFile.name : 'Choose your scholarship PDF'}</strong>
          <small>{selectedFile ? `${Math.ceil(selectedFile.size / 1024)} KB · ready for private upload` : 'PDF only · private S3 storage · max 10 MB'}</small>
        </label>

        {/* Text Preview Box */}
        <div>
          <label htmlFor="doc-content-textarea" className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
            Document Content
          </label>
          <textarea
            id="doc-content-textarea"
            rows={10}
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            disabled={isAnalyzing}
            className="w-full font-mono text-xs p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-y"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {isAnalyzing && uploadStatus && <p className="upload-status">⏳ {uploadStatus}</p>}
      </div>

      {/* Analysis Results View (AT-03 & AT-04) */}
      {analysisResult && (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-6 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-500/20 pb-4">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
                <span>✓ Extraction Verified (PRD §14)</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {analysisResult.title}
              </h3>
              {analysisResult.deadline && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Normalized Deadline:{' '}
                  <strong>{new Date(analysisResult.deadline).toLocaleString()}</strong>
                </p>
              )}
            </div>

            {createdJourneyId && (
              <button
                type="button"
                onClick={() => router.push(`/journeys/${createdJourneyId}`)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold shadow hover:opacity-90 transition-transform active:scale-95 shrink-0"
              >
                Open Generated Journey Graph →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Eligibility */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Extracted Eligibility
              </h4>
              <ul className="space-y-1 list-disc list-inside text-zinc-600 dark:text-zinc-300">
                {analysisResult.eligibility.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Required Documents */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Prerequisite Documents
              </h4>
              <ul className="space-y-1 list-disc list-inside text-zinc-600 dark:text-zinc-300">
                {analysisResult.required_documents.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* AT-04: Ambiguous Requirements Section */}
          {analysisResult.uncertainties && analysisResult.uncertainties.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2">
                <EvidenceBadge state="UNKNOWN" />
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                  Ambiguous Clauses — Flagged as Needs Verification (AT-04)
                </h4>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                The document contains unverified conditions that cannot be asserted as verified fact:
              </p>
              <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300 pl-4 list-disc">
                {analysisResult.uncertainties.map((u: string, idx: number) => (
                  <li key={idx}>"{u}"</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
