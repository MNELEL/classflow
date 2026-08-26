import { Navigate } from 'react-router-dom';

// The parent portal is unified into the weekly-communication hub under the
// "הודעות להורים" tab. /parents now redirects there so there's a single
// central communication page.
export default function ParentPortalPage() {
  return <Navigate to="/weekly-communication?tab=parents" replace />;
}