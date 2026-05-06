import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Pencil } from 'lucide-react';

const STORAGE_KEY = 'classmanager_groups';

export function loadGroups() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveGroups(groups) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)); } catch {}
}

const GROUP_TYPES = [
  { value: 'together', label: '🤝 לישיבה יחד', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'separate', label: '↔️ לישיבה רחוק', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'task', label: '📋 קבוצת משימה', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
];

export function getGroupTypeColor(type) {
  return GROUP_TYPES.find(t => t.value === type)?.color || 'bg-muted text-muted-foreground';
}
export function getGroupTypeLabel(type) {
  return GROUP_TYPES.find(t => t.value === type)?.label || type;
}

export default function GroupsManager({ open, onClose, students }) {
  const [groups, setGroups] = useState(loadGroups);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('together');
  const [editingGroup, setEditingGroup] = useState(null);

  function addGroup() {
    if (!newName.trim()) return;
    const updated = [...groups, { id: Date.now().toString(), name: newName.trim(), type: newType }];
    setGroups(updated);
    saveGroups(updated);
    setNewName('');
  }

  function deleteGroup(id) {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    saveGroups(updated);
  }

  function getMemberCount(groupName) {
    return students.filter(s => s.learning_group === groupName || s.group === groupName).length;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> ניהול תת-קבוצות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new group */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">קבוצה חדשה</p>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="שם הקבוצה..."
              onKeyDown={e => e.key === 'Enter' && addGroup()}
            />
            <div className="flex flex-wrap gap-1.5">
              {GROUP_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setNewType(t.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    newType === t.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button onClick={addGroup} size="sm" className="w-full" disabled={!newName.trim()}>
              <Plus className="w-4 h-4 ml-1" /> הוסף קבוצה
            </Button>
          </div>

          {/* Groups list */}
          {groups.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
              אין קבוצות עדיין
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div>
                      <p className="font-medium text-sm truncate">{g.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getGroupTypeColor(g.type)}`}>
                          {getGroupTypeLabel(g.type)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{getMemberCount(g.name)} תלמידים</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0"
                    onClick={() => deleteGroup(g.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center bg-muted/30 rounded-lg p-2">
            💡 שייך תלמידים לקבוצות דרך טופס עריכת התלמיד (שדה "קבוצת למידה")
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}