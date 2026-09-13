import { Kit, QuestionCategory } from '@/types';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api'))
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api');

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('trao_auth_token');
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('trao_auth_token', token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('trao_auth_token');
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data as T;
  } catch (err: any) {
    if (retries > 0 && (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError'))) {
      await new Promise(r => setTimeout(r, 1000));
      return request<T>(endpoint, options, retries - 1);
    }
    throw err;
  }
}

export const api = {
  // Auth
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    setToken(res.token);
    return res;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  logout(): void {
    clearToken();
  },

  // Kits
  async getKits(): Promise<{ kits: any[] }> {
    return request<{ kits: any[] }>('/kits');
  },

  async getKit(id: string): Promise<{ kit: Kit & { _id: string } }> {
    return request<{ kit: Kit & { _id: string } }>(`/kits/${id}`);
  },

  async generateKit(payload: {
    jd: string;
    company_url: string;
    days: number;
    custom_rounds?: string[];
    resume_text?: string;
    resume_file_name?: string;
  }): Promise<{ jobId?: string; kit?: Kit & { _id: string } }> {
    return request<{ jobId?: string; kit?: Kit & { _id: string } }>('/kits/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getGenerationJob(jobId: string): Promise<{
    job: {
      id: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      stageIndex: number;
      stageName: string;
      message: string;
      progress: number;
      kitId?: string;
      error?: string;
    }
  }> {
    return request(`/kits/jobs/${jobId}`);
  },

  async batchUpload(items: { jd: string; company_url: string; days: number; custom_rounds?: string[] }[]): Promise<{ kits: any[] }> {
    return request<{ kits: any[] }>('/kits/batch-upload', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  },

  async updateKit(id: string, updates: Partial<Kit>): Promise<{ kit: Kit }> {
    return request<{ kit: Kit }>(`/kits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async regenerateSection(id: string, section: 'company_brief' | 'category' | 'schedule', category?: QuestionCategory): Promise<{ kit: Kit }> {
    return request<{ kit: Kit }>(`/kits/${id}/regenerate-section`, {
      method: 'POST',
      body: JSON.stringify({ section, category })
    });
  },

  async deleteKit(id: string): Promise<void> {
    await request(`/kits/${id}`, { method: 'DELETE' });
  },

  // Creative Feature: Real-time Mock Interview Diagnostic
  async evaluateMockAnswer(kitId: string, question_id: string, candidate_answer: string): Promise<{
    evaluation: {
      readiness_score: number;
      strengths: string[];
      weak_spots: string[];
      coaching_tip: string;
      resume_alignment_tip?: string;
    }
  }> {
    return request(`/kits/${kitId}/mock-interview-eval`, {
      method: 'POST',
      body: JSON.stringify({ question_id, candidate_answer })
    });
  },

  // Resume Tailoring
  async uploadResume(kitId: string, payload: { resume_text?: string; file_name?: string; file_base64?: string }): Promise<{
    message: string;
    candidate_resume: any;
  }> {
    return request(`/kits/${kitId}/resume`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async tailorQuestion(kitId: string, questionId: string, resume_text?: string): Promise<{
    message: string;
    question: any;
  }> {
    return request(`/kits/${kitId}/questions/${questionId}/tailor`, {
      method: 'POST',
      body: JSON.stringify({ resume_text })
    });
  },

  async tailorAllQuestions(kitId: string, resume_text?: string): Promise<{
    message: string;
    kit: any;
  }> {
    return request(`/kits/${kitId}/tailor-all`, {
      method: 'POST',
      body: JSON.stringify({ resume_text })
    });
  }
};
