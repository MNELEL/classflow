import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, Phone, BookOpen, Key } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    if (!fullName.trim()) {
      setError("נא להזין שם מלא");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password, full_name: fullName });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "שגיאה בהרשמה");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Save extra profile data (phone, subject)
      const extraData = {};
      if (phone) extraData.phone = phone;
      if (subject) extraData.subject = subject;
      if (Object.keys(extraData).length > 0) {
        try {
          await base44.auth.updateMe(extraData);
        } catch { /* non-critical */ }
      }
      // Link teacher if access code provided
      if (accessCode.trim()) {
        try {
          const res = await base44.functions.invoke("linkTeacher", { access_code: accessCode.trim() });
          if (res.data?.success) {
            toast({
              title: "המורה קושר בהצלחה!",
              description: `ברוך הבא, ${res.data.teacher.full_name}!`,
            });
            window.location.href = "/teacher-dashboard";
            return;
          }
        } catch (err) {
          // Linking failed — redirect to home but notify
          toast({
            title: "קוד הגישה לא נמצא",
            description: "ניתן להשלים את ההרשמה ולחבר את הקוד לאחר מכן דרך כניסת מורים.",
            variant: "destructive",
          });
        }
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "קוד אימות לא תקין");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "קוד נשלח", description: "בדוק את האימייל שלך לקוד החדש." });
    } catch (err) {
      setError(err.message || "שגיאה בשליחת קוד");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="אימות אימייל" subtitle={`שלחנו קוד לכתובת ${email}`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> מאמת...</>) : "אימות"}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          לא קיבלת קוד?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">שלח שוב</button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="יצירת חשבון"
      subtitle="הירשם כדי להתחיל"
      footer={
        <>
          יש לך כבר חשבון?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">התחבר</Link>
          {" | "}
          <Link to="/teacher-login" className="text-primary font-medium hover:underline">כניסת מורים</Link>
        </>
      }
    >
      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" />
        המשך עם Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">או</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">שם מלא *</Label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="שם פרטי ושם משפחה"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pr-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">אימייל *</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10 h-12"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="050-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pr-10 h-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">מקצוע עיקרי</Label>
            <div className="relative">
              <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="subject"
                type="text"
                placeholder="למשל: היסטוריה"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="pr-10 h-12"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">סיסמה *</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">אישור סיסמה *</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="accessCode">קוד גישה אישי</Label>
          <div className="relative">
            <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="accessCode"
              type="text"
              placeholder="למשל: A3F9K2"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="pr-10 h-12 font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            קוד הגישה ניתן לך על ידי מנהל המערכת. הזנת קוד תקשר אוטומטית את החשבון שלך למורה.
          </p>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> יוצר חשבון...</>) : "צור חשבון"}
        </Button>
      </form>
    </AuthLayout>
  );
}