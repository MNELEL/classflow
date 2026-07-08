import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Key, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "sonner";

export default function TeacherLogin() {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Find teacher by access code
      const teachers = await base44.entities.Teacher.filter({ access_code: accessCode.trim(), is_active: true });
      
      if (!teachers || teachers.length === 0) {
        setError("קוד הגישה לא תקין או שאינו פעיל");
        setLoading(false);
        return;
      }

      const teacher = teachers[0];
      
      // Teacher identity is validated server-side via base44.auth.me() +
      // Teacher entity filter in TeacherDashboard. No client-controlled
      // session storage is used for access control or role assignment.
      toast.success(`ברוך הבא, ${teacher.full_name}!`);
      navigate('/teacher-dashboard');
    } catch (err) {
      setError(err.message || "שגיאה בכניסה למערכת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="כניסת מורים"
      subtitle="הזינו קוד גישה אישי"
      footer={
        <>
          <Link to="/login" className="text-primary font-medium hover:underline">
            חזרה לכניסה רגילה
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessCode">קוד גישה אישי</Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="accessCode"
              type="text"
              autoFocus
              placeholder="הזינו קוד גישה"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            הקוד האישי ניתן לכם על ידי מנהל המערכת
          </p>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              מתחבר...
            </>
          ) : (
            "כניסה לכיתה שלי"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}