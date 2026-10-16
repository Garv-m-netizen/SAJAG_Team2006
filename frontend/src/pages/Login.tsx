import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setError('');
    setIsSubmitting(true);
    try {
      await quickLogin(demoEmail, demoPass);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Quick login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
          CP
        </div>
        <h2 className="text-2xl font-bold text-[#1A1D20] tracking-tight">CivicPulse AI</h2>
        <p className="text-xs text-[#6C757D]">
          Chandigarh Connected Civic Intelligence & Operations Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-6 px-6 border border-[#E5E7EB] rounded-lg shadow-sm space-y-5">
          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicpulse.chandigarh.gov.in"
                  className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:ring-1 focus:ring-[#0F766E] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1D20] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:ring-1 focus:ring-[#0F766E] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#0F766E] hover:bg-[#0D9488] disabled:bg-gray-300 text-white font-medium text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Persona Switcher for Hackathon Evaluation */}
          <div className="pt-4 border-t border-[#F1F3F5] space-y-2">
            <span className="text-xs font-semibold text-[#374151] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#0F766E]" />
              Quick Demo Evaluator Logins:
            </span>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin@civicpulse.chandigarh.gov.in', 'Admin@123')}
                className="w-full text-left p-2 rounded border border-[#E5E7EB] hover:bg-gray-50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-purple-900 block">Dr. Rajesh Sharma (Administrator)</span>
                  <span className="text-[10px] text-gray-500">Full control, overrides, optimizer</span>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">ADMIN</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('worker1@civicpulse.chandigarh.gov.in', 'Worker@123')}
                className="w-full text-left p-2 rounded border border-[#E5E7EB] hover:bg-gray-50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-amber-900 block">Vikram Singh (Field Worker)</span>
                  <span className="text-[10px] text-gray-500">Work orders, before/after evidence</span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">CREW</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('citizen1@chandigarh.org', 'Citizen@123')}
                className="w-full text-left p-2 rounded border border-[#E5E7EB] hover:bg-gray-50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-teal-900 block">Garv Sharma (Citizen)</span>
                  <span className="text-[10px] text-gray-500">Report complaints, earn rewards, verify</span>
                </div>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">CITIZEN</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
