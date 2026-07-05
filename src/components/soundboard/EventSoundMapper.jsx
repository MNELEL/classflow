import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Zap, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CLASSROOM_EVENTS = [
  { key: 'academic_achievement', label: '🏆 הישג לימודי', description: 'תלמיד ענה נכון / הצטיין' },
  { key: 'chapter_complete', label: '📖 סיום פרק', description: 'סיום פרק / יחידת לימוד' },
  { key: 'full_attendance', label: '✅ נוכחות מלאה', description: 'כל הכיתה נוכחת' },
  { key: 'homework_submitted', label: '📝 הגשת שיעורי בית', description: 'כולם הגישו' },
  { key: 'lesson_start', label: '🔔 תחילת שיעור', description: 'פתיחת השיעור' },
  { key: 'lesson_end', label: '🏁 סיום שיעור', description: 'סגירת השיעור' },
  { key: 'raffle_winner', label: '🎉 זוכה בהגרלה', description: 'נבחר תלמיד בהגרלה' },
  { key: 'campaign_goal', label: '🌟 השגת יעד מבצע', description: 'הכיתה הגיעה ליעד' },
];

const STORAGE_KEY = 'classmanager_event_sounds';

function loadMappings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveMappings(m) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

export default function EventSoundMapper() {
  const [mappings, setMappings] = useState(loadMappings);
  const [playingId, setPlayingId] = useState(null);
  const audioRefs = useRef({});

  const { data: sounds = [] } = useQuery({
    queryKey: ['sounds'],
    queryFn: () => base44.entities.LibraryItem.filter({ category: 'צלילים וכרזות' }),
  });

  function handleMap(eventKey, soundId) {
    const next = { ...mappings, [eventKey]: soundId || null };
    setMappings(next);
    saveMappings(next);
  }

  function triggerEvent(eventKey) {
    const soundId = mappings[eventKey];
    if (!soundId) {
      toast('לא מוגדר צליל לאירוע זה');
      return;
    }
    const audio = audioRefs.current[soundId];
    if (!audio) return;
    // Stop any playing
    Object.values(audioRefs.current).forEach(a => { a.pause(); a.currentTime = 0; });
    audio.play();
    setPlayingId(soundId);
    const eventLabel = CLASSROOM_EVENTS.find(e => e.key === eventKey)?.label || '';
    toast.success(`▶ ${eventLabel}`);
  }

  function stopAll() {
    Object.values(audioRefs.current).forEach(a => { a.pause(); a.currentTime = 0; });
    setPlayingId(null);
  }

  const mappedCount = Object.values(mappings).filter(Boolean).length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-600" />
          מיפוי אירועים לצלילים
          {mappedCount > 0 && (
            <Badge className="bg-purple-100 text-purple-800 border-0 text-[10px]">{mappedCount} ממופים</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {sounds.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            אין קבצי צליל. <a href="/sound-board" className="text-primary underline">העלה קבצים תחילה</a>
          </p>
        ) : (
          CLASSROOM_EVENTS.map(event => {
            const assignedId = mappings[event.key];
            const assignedSound = sounds.find(s => s.id === assignedId);
            const isPlaying = playingId === assignedId;

            return (
              <div key={event.key} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{event.label}</p>
                  <p className="text-[10px] text-muted-foreground">{event.description}</p>
                </div>

                <Select value={assignedId || '_none'} onValueChange={v => handleMap(event.key, v === '_none' ? '' : v)}>
                  <SelectTrigger className="text-[11px] border border-border rounded-md h-8 bg-background max-w-[120px]"><SelectValue placeholder="— ללא צליל —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— ללא צליל —</SelectItem>
                    {sounds.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => assignedId ? (isPlaying ? stopAll() : triggerEvent(event.key)) : null}
                  disabled={!assignedId}
                  aria-label={isPlaying ? 'עצור צליל' : 'הפעל צליל'}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    !assignedId
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : isPlaying
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                  title={assignedId ? 'הפעל צליל' : 'בחר צליל תחילה'}
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })
        )}

        {/* Hidden audio elements */}
        {sounds.map(sound => (
          <audio
            key={sound.id}
            ref={el => { if (el) audioRefs.current[sound.id] = el; }}
            src={sound.file_url}
            onEnded={() => setPlayingId(null)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// Exported helper — call this from anywhere to trigger a mapped event sound
export function triggerEventSound(eventKey) {
  const mappings = loadMappings();
  const soundId = mappings[eventKey];
  if (!soundId) return;
  // We dispatch a custom event that SoundBoardPage or EventSoundMapper listens to
  window.dispatchEvent(new CustomEvent('cm_play_sound', { detail: { soundId } }));
}