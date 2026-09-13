'use client';

import React, { useState, useRef } from 'react';
import { api } from '../lib/api';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCode2,
  ArrowRight
} from 'lucide-react';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  kitId: string;
  currentResume?: {
    text: string;
    file_name?: string;
    uploaded_at: string;
    extracted_skills?: string[];
    current_title?: string;
  };
  onSuccess: (updatedKit?: any) => void;
}

const SAMPLE_RESUME = `ALEX CHEN
Senior Software Engineer | San Francisco, CA | alex.chen@example.com

SUMMARY
Full-stack software engineer with 6+ years of experience designing and scaling distributed systems, cloud architectures, and modern web applications. Led migration of monolithic services to event-driven microservices serving 12M+ monthly active users.

EXPERIENCE
Stripe | Senior Software Engineer | 2022 – Present
• Spearheaded the re-architecture of the core checkout pipeline using Go, Kafka, and Redis, improving P99 API latency by 42% under peak holiday loads.
• Designed and deployed an automated reconciliation service in Python and PostgreSQL, reducing settlement discrepancies by 98% and saving $1.4M annually.
• Mentored 5 junior engineers and led bi-weekly distributed systems design reviews.

Shopify | Software Engineer | 2019 – 2022
• Built real-time inventory management microservices using Node.js, TypeScript, and MongoDB handling 25,000 requests/second during Black Friday/Cyber Monday.
• Implemented distributed locking mechanisms via Redis to eliminate race conditions in multi-region checkout carts.
• Containerized 18 legacy services using Docker and orchestrated deployments with Kubernetes (EKS) and GitHub Actions.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Go, Python, SQL
Frameworks & Libraries: React, Next.js, Node.js, Express, TailwindCSS
Infrastructure & Databases: PostgreSQL, MongoDB, Redis, Apache Kafka, AWS (ECS, EKS, Lambda, S3), Docker, Kubernetes, Terraform
Practices: Distributed System Design, REST APIs, Microservices, CI/CD, Unit Testing (Jest), Agile/Scrum`;

export default function ResumeModal({
  isOpen,
  onClose,
  kitId,
  currentResume,
  onSuccess
}: ResumeModalProps) {
  const [resumeText, setResumeText] = useState(currentResume?.text || '');
  const [fileName, setFileName] = useState(currentResume?.file_name || '');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tailoringAll, setTailoringAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFileBase64(base64);
        setResumeText(`[PDF Document Uploaded: ${file.name} - Will be extracted by AI server]`);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        setResumeText(text);
        setFileBase64(null);
      };
      reader.readAsText(file);
    }
  };

  const handleSaveResume = async (andTailorAll: boolean = false) => {
    if (!resumeText.trim() && !fileBase64) {
      setError('Please paste your resume or upload a file.');
      return;
    }

    setLoading(true);
    if (andTailorAll) setTailoringAll(true);
    setError(null);

    try {
      const res = await api.uploadResume(kitId, {
        resume_text: fileBase64 ? undefined : resumeText.trim(),
        file_name: fileName || 'Uploaded Resume',
        file_base64: fileBase64 || undefined
      });

      if (andTailorAll) {
        await api.tailorAllQuestions(kitId, resumeText);
      }

      setSuccessMsg(
        andTailorAll
          ? 'Resume attached and all key questions tailored!'
          : 'Resume attached successfully!'
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save resume');
    } finally {
      setLoading(false);
      setTailoringAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0a0f0c] border border-emerald-500/20 rounded-2xl p-6 sm:p-7 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Attach Candidate Resume
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                AI Answer Tailoring
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              The AI pipeline will weave your actual projects, technologies, and achievements into STAR answers and interview talking points.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action toolbar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.docx,.json"
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#101713] border border-[#1b2720] text-emerald-400 hover:text-white hover:border-emerald-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{fileName ? `Change File (${fileName})` : 'Upload PDF / Text'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setResumeText(SAMPLE_RESUME);
                setFileName('Alex_Chen_Staff_Engineer.txt');
                setFileBase64(null);
              }}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Load full stack senior engineer sample resume"
            >
              ✦ Load Sample Resume
            </button>
          </div>

          {currentResume?.current_title && (
            <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
              Active: <span className="text-emerald-300 font-semibold">{currentResume.current_title}</span>
            </span>
          )}
        </div>

        {/* Textarea */}
        <div className="space-y-1.5 mb-5">
          <label className="block text-xs font-semibold text-slate-300">
            Resume Content (Pasted or Extracted Text)
          </label>
          <textarea
            rows={10}
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              setFileBase64(null);
            }}
            placeholder="Paste your resume text here (Work experience, technical skills, projects, metrics)..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-[#1b2720] text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-y placeholder:text-slate-600"
          />
        </div>

        {/* Footer controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#1b2720]">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            Your resume is securely stored with this kit and never shared externally.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveResume(false)}
              disabled={loading}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {loading && !tailoringAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Resume</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveResume(true)}
              disabled={loading}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
            >
              {tailoringAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Save & Tailor Answers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
