import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Global fallback so a mutation that has no onError of its own still tells
// the user something failed, instead of failing silently (e.g. a delete
// that drops offline with no visible error). Components that already pass
// their own onError keep it — React Query v5 calls the mutation-defaults
// onError first, then the mutation's own onError; it doesn't replace one
// with the other.
function defaultMutationErrorHandler(error) {
  const message = !navigator.onLine
    ? 'אין חיבור לאינטרנט — הפעולה לא בוצעה'
    : 'משהו השתבש. נסו שוב';
  console.error('[mutation error]', error);
  toast.error(message);
}

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
		mutations: {
			onError: defaultMutationErrorHandler,
		},
	},
});