import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import LibraryItemDetail from '@/components/library/LibraryItemDetail';

export default function LibraryItemPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-4">
        <LibraryItemDetail itemId={itemId} onClose={() => navigate('/library')} />
      </div>
    </AppLayout>
  );
}