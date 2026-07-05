import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import EventSoundMapper from '@/components/soundboard/EventSoundMapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Upload, Trash2, Volume2, Trophy, Bell, Music } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { warmSoundBoardMedia } from '@/lib/mediaWarmup';

export default function SoundBoardPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const audioRefs = useRef({});

  const { data: sounds = [], isLoading } = useQuery({
    queryKey: ['sounds'],
    queryFn: () => base44.entities.LibraryItem.filter({ category: 'צלילים וכרזות' }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.LibraryItem.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        source_type: 'audio_file',
        file_url,
        file_name: file.name,
        file_size: file.size,
        category: 'צלילים וכרזות',
        subject: 'אודיו',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sounds'] });
      toast.success('קובץ הועלה בהצלחה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LibraryItem.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sounds'] });
      toast.success('קובץ נמחק');
    },
  });

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('יש לבחור קובץ אודיו בלבד (MP3, WAV, etc.)');
      return;
    }
    uploadMutation.mutate(file);
    e.target.value = '';
  }

  function handlePlay(id, url) {
    const audio = audioRefs.current[id];
    if (!audio) return;
    
    // Stop all other audio
    Object.values(audioRefs.current).forEach(a => {
      if (a !== audio) {
        a.pause();
        a.currentTime = 0;
      }
    });

    if (audio.paused) {
      audio.play();
      setPlayingId(id);
    } else {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
    }
  }

  function handleEnded(id) {
    setPlayingId(null);
  }

  // Preload audio assets when sounds are loaded
  useEffect(() => {
    if (sounds.length > 0) {
      warmSoundBoardMedia(sounds);
    }
  }, [sounds]);

  const achievementSounds = sounds.filter(s => 
    s.tags?.includes('הישג') || s.tags?.includes('ניצחון') || s.tags?.includes('הצלחה')
  );
  const alertSounds = sounds.filter(s => 
    s.tags?.includes('תשומת לב') || s.tags?.includes('אזהרה') || s.tags?.includes('מעבר')
  );
  const musicSounds = sounds.filter(s => 
    !achievementSounds.includes(s) && !alertSounds.includes(s)
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-4xl mx-auto" dir="rtl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-xl">🎵</div>
          <div>
            <h1 className="font-bold text-base">ניהול סאונד ואפקטים</h1>
            <p className="text-xs text-muted-foreground">העלה קבצי אודיו והפעל צלצולים להישגים</p>
          </div>
        </div>

        {/* Upload */}
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploadMutation.isPending ? 'מעלה...' : 'העלה קובץ אודיו חדש'}
              </Button>
              <p className="text-xs text-muted-foreground">תומך ב-MP3, WAV, OGG, M4A</p>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Sounds */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <h2 className="text-sm font-bold">צלילי הישגים וניצחונות</h2>
            <Badge className="bg-yellow-100 text-yellow-800 border-0 text-[10px]">{achievementSounds.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {achievementSounds.map(sound => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isPlaying={playingId === sound.id}
                onPlay={() => handlePlay(sound.id, sound.file_url)}
                onDelete={() => deleteMutation.mutate(sound.id)}
                audioRef={(el) => { audioRefs.current[sound.id] = el; }}
                onEnded={() => handleEnded(sound.id)}
                type="achievement"
              />
            ))}
          </div>
          {achievementSounds.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              אין עדיין צלילי הישגים. העלה קבצים ותייג אותם כ"הישג" או "ניצחון"
            </p>
          )}
        </div>

        {/* Alert Sounds */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold">צלילי התראה ומעבר</h2>
            <Badge className="bg-orange-100 text-orange-800 border-0 text-[10px]">{alertSounds.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alertSounds.map(sound => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isPlaying={playingId === sound.id}
                onPlay={() => handlePlay(sound.id, sound.file_url)}
                onDelete={() => deleteMutation.mutate(sound.id)}
                audioRef={(el) => { audioRefs.current[sound.id] = el; }}
                onEnded={() => handleEnded(sound.id)}
                type="alert"
              />
            ))}
          </div>
          {alertSounds.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              אין עדיין צלילי התראה. העלה קבצים ותייג אותם כ"תשומת לב" או "מעבר"
            </p>
          )}
        </div>

        {/* Music */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold">מוזיקה כללית</h2>
            <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">{musicSounds.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {musicSounds.map(sound => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isPlaying={playingId === sound.id}
                onPlay={() => handlePlay(sound.id, sound.file_url)}
                onDelete={() => deleteMutation.mutate(sound.id)}
                audioRef={(el) => { audioRefs.current[sound.id] = el; }}
                onEnded={() => handleEnded(sound.id)}
                type="music"
              />
            ))}
          </div>
          {musicSounds.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              אין עדיין קבצי מוזיקה
            </p>
          )}
        </div>

        {/* Event → Sound mapping */}
        <EventSoundMapper />

        {/* Hidden audio elements */}
        {sounds.map(sound => (
          <audio
            key={sound.id}
            ref={el => { if (el) audioRefs.current[sound.id] = el; }}
            src={sound.file_url}
            onEnded={() => handleEnded(sound.id)}
          />
        ))}
      </div>
    </AppLayout>
  );
}

function SoundCard({ sound, isPlaying, onPlay, onDelete, audioRef, onEnded, type }) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (tags) => base44.entities.LibraryItem.update(sound.id, { tags }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sounds'] });
      toast.success('תגיות עודכנו');
    },
  });

  function handleAddTag() {
    if (!tagInput.trim()) return;
    const newTags = [...(sound.tags || []), tagInput.trim()];
    updateMutation.mutate(newTags);
    setTagInput('');
    setShowTagInput(false);
  }

  function handleRemoveTag(tagToRemove) {
    const newTags = (sound.tags || []).filter(t => t !== tagToRemove);
    updateMutation.mutate(newTags);
  }

  const iconColors = {
    achievement: 'text-yellow-600 bg-yellow-50',
    alert: 'text-orange-600 bg-orange-50',
    music: 'text-blue-600 bg-blue-50',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlay}
            aria-label={isPlaying ? 'עצור' : 'הפעל צליל'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isPlaying ? 'bg-primary text-white' : iconColors[type]
            }`}
          >
            {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{sound.title}</p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {sound.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0 h-4">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              ))}
              {(!sound.tags || sound.tags.length === 0) && (
                <span className="text-[9px] text-muted-foreground">ללא תגיות</span>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setShowTagInput(v => !v)}
              aria-label="הוסף תגית"
              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-xs"
              title="הוסף תגית"
            >
              🏷️
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="מחק צליל"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {showTagInput && (
          <div className="flex gap-1 mt-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="הישג, ניצחון, מעבר..."
              className="h-7 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
            />
            <Button size="sm" variant="outline" onClick={handleAddTag} className="h-7 px-2">
              ✓
            </Button>
          </div>
        )}

        <audio ref={audioRef} src={sound.file_url} onEnded={onEnded} />
      </CardContent>
    </Card>
  );
}