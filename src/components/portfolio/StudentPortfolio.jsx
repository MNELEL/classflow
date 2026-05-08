import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Phone, History } from 'lucide-react';
import DocumentsVault from './DocumentsVault';
import ParentContactLog from './ParentContactLog';

export default function StudentPortfolio({ student, open }) {
  if (!open || !student) return null;

  return (
    <div className="mt-4 border border-border/60 rounded-2xl overflow-hidden bg-card/50" dir="rtl">
      <div className="bg-primary/5 border-b border-border/40 px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-sm">{student.name}</p>
          <p className="text-xs text-muted-foreground">תיק אישי</p>
        </div>
      </div>

      <Tabs defaultValue="documents" dir="rtl" className="p-3">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="documents" className="gap-1.5 text-xs">
            <FolderOpen className="w-3.5 h-3.5" /> מסמכים
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5 text-xs">
            <Phone className="w-3.5 h-3.5" /> קשר עם הורים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentsVault studentId={student.id} />
        </TabsContent>

        <TabsContent value="contacts">
          <ParentContactLog studentId={student.id} studentName={student.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}