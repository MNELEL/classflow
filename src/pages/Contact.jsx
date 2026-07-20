import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Phone, MapPin, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sanitize user input — strip control characters and limit length
      // to prevent content spoofing / email header injection
      const sanitize = (str, max = 500) => (str || '').replace(/[\x00-\x1F\x7F]/g, ' ').slice(0, max).trim();
      await base44.integrations.Core.SendEmail({
        to: 'support@classflow.app',
        subject: `הודעה חדשה מ-${sanitize(name, 80) || 'אנונימי'}`,
        body: `שם: ${sanitize(name, 100)}\nאימייל: ${sanitize(email, 100)}\n\n${sanitize(message, 2000)}`,
      });
      setSent(true);
      setName(''); setEmail(''); setMessage('');
    } catch (err) {
      // error bubbles up
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Mail className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">צרו קשר</h1>
          <p className="text-muted-foreground mt-2">נשמח לשמוע מכם ולעזור בכל שאלה</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Mail className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">אימייל</p>
            <a href="mailto:support@classflow.app" className="text-sm font-medium text-foreground hover:underline">support@classflow.app</a>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Phone className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">טלפון</p>
            <a href="tel:+972-3-123-4567" className="text-sm font-medium text-foreground hover:underline">03-123-4567</a>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <MapPin className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">כתובת</p>
            <p className="text-sm font-medium text-foreground">תל אביב, ישראל</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">ההודעה נשלחה בהצלחה!</p>
              <p className="text-sm text-muted-foreground mt-1">נחזור אליכם בהקדם האפשרי.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ישראל ישראלי" className="h-12" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">הודעה</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="כיצד נוכל לעזור?" rows={5} required />
              </div>
              <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    שלח הודעה
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <ArrowRight className="w-4 h-4" />
            חזרה להתחברות
          </Link>
        </div>
      </div>
    </div>
  );
}