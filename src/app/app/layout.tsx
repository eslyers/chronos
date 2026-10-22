// src/app/app/layout.tsx
import AppLayout from '@/components/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import { DataProvider } from '@/lib/context/DataContext';
import { ToastProvider } from '@/components/ui/toast-notification';

// ToastProvider envolve o DataProvider para que erros de persistência
// apareçam como toast
export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <GlobalProvider>
            <ToastProvider>
                <DataProvider>
                    <ErrorBoundary>
                        <AppLayout>{children}</AppLayout>
                    </ErrorBoundary>
                </DataProvider>
            </ToastProvider>
        </GlobalProvider>
    );
}
