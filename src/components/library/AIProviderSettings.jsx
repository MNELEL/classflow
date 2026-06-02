import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, Check, Eye, EyeOff, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🟢',
    models: ['GPT-4o', 'GPT-4 Turbo', 'GPT-3.5 Turbo'],
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: 'border-green-400 bg-green-50 dark:bg-green-900/20',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '🔵',
    models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'Gemini 2.0'],
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    color: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: '🟠',
    models: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'],
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🟣',
    models: ['sonar-pro', 'sonar', 'sonar-reasoning'],
    placeholder: 'pplx-...',
    docsUrl: 'https://www.perplexity.ai/settings/api',
    color: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    icon: '⚪',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
    placeholder: '...',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    color: 'border-gray-400 bg-gray-50 dark:bg-gray-900/20',
  },
];

const STORAGE_KEY = 'classmanager_ai_providers';

function loadKeys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export default function AIProviderSettings({ open, onClose }) {
  const [keys, setKeys] = useState(loadKeys());
  const [activeProvider, setActiveProvider] = useState(null);
  const [showKeys, setShowKeys] = useState({});
  const [selectedModels, setSelectedModels] = useState(() => {
    try { return JSON.parse(localStorage.getItem('classmanager_ai_models') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    if (open) setKeys(loadKeys());
  }, [open]);

  const setKey = (providerId, value) => {
    setKeys(prev => ({ ...prev, [providerId]: value }));
  };

  const removeKey = (providerId) => {
    setKeys(prev => { const n = { ...prev }; delete n[providerId]; return n; });
  };

  const handleSave = () => {
    saveKeys(keys);
    localStorage.setItem('classmanager_ai_models', JSON.stringify(selectedModels));
    toast.success('הגדרות AI נשמרו ✓');
    onClose();
  };

  const connectedCount = Object.keys(keys).filter(k => keys[k]?.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            הגדרות ספקי AI
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            הזן מפתחות API כדי להתחבר לספקי AI שונים. המפתחות נשמרים רק במכשיר שלך.
          </p>
        </DialogHeader>

        {connectedCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-700 dark:text-green-400">
              {connectedCount} ספק{connectedCount > 1 ? 'ים' : ''} מחובר{connectedCount > 1 ? 'ים' : ''}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {PROVIDERS.map(provider => {
            const hasKey = !!keys[provider.id]?.trim();
            const isActive = activeProvider === provider.id;
            return (
              <div
                key={provider.id}
                className={cn(
                  'border rounded-xl transition-all',
                  hasKey ? provider.color : 'border-border bg-card',
                  isActive && 'shadow-md'
                )}
              >
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => setActiveProvider(isActive ? null : provider.id)}
                >
                  <span className="text-2xl">{provider.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{provider.name}</p>
                      {hasKey && <Badge className="text-[10px] h-4 bg-green-500 text-white">✓ מחובר</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{provider.models.join(' • ')}</p>
                  </div>
                  <Sparkles className={cn('w-4 h-4 transition-colors', hasKey ? 'text-primary' : 'text-muted-foreground')} />
                </div>

                {isActive && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                    <Label className="text-xs">מפתח API</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          placeholder={provider.placeholder}
                          value={keys[provider.id] || ''}
                          onChange={e => setKey(provider.id, e.target.value)}
                          className="h-8 text-xs pr-2 pl-8 font-mono"
                          dir="ltr"
                        />
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowKeys(p => ({ ...p, [provider.id]: !p[provider.id] }))}
                        >
                          {showKeys[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {hasKey && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive px-2"
                          onClick={() => removeKey(provider.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs mb-1 block">מודל מועדף</Label>
                      <div className="flex flex-wrap gap-1">
                        {provider.models.map(m => (
                          <button
                            key={m}
                            onClick={() => setSelectedModels(p => ({ ...p, [provider.id]: m }))}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] border transition-colors',
                              selectedModels[provider.id] === m
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:border-primary/40'
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-primary underline">
                      איך מקבלים מפתח API? ←
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground mb-3">
            🔒 המפתחות נשמרים רק על המכשיר שלך ואינם נשלחים לשרתים חיצוניים
          </p>
          <Button className="w-full" onClick={handleSave}>
            <Check className="w-4 h-4 ml-1" />
            שמור הגדרות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}