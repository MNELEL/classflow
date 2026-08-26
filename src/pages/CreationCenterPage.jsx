import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, Layers, FileText, Shield } from 'lucide-react';
import CreateTab from '@/components/creation/CreateTab';
import QuestionBankTab from '@/components/creation/QuestionBankTab';
import ExamBuilderTab from '@/components/creation/ExamBuilderTab';
import AdminTab from '@/components/creation/AdminTab';

const TABS = [
  { id: 'create', label: 'יצירה חדשה', icon: Sparkles },
  { id: 'bank', label: 'בנק שאלות', icon: Layers },
  { id: 'exam', label: 'הרכבת מבחן', icon: FileText },
  { id: 'admin', label: 'ניהול', icon: Shield, adminOnly: true },
];

export default function CreationCenterPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const allowed = TABS.filter((t) => !t.adminOnly || isAdmin);
  const tab = allowed.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'create';
  const switchTab = (v) => setParams({ tab: v }, { replace: true });

  return (
    <AppLayout>
      <div className="flex flex-col h-full" dir="rtl">
        <div className="px-3 py-2 border-b border-border bg-card flex gap-1 overflow-x-auto no-scrollbar">
          {allowed.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0">
          {tab === 'create' && <CreateTab />}
          {tab === 'bank' && <QuestionBankTab onGoToExam={() => switchTab('exam')} />}
          {tab === 'exam' && <ExamBuilderTab onGoToBank={() => switchTab('bank')} />}
          {tab === 'admin' && isAdmin && <AdminTab />}
        </div>
      </div>
    </AppLayout>
  );
}