// src/app/app/layout.tsx
import AppLayout from '@/components/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import { DataProvider } from '@/lib/context/DataContext';
import { ToastProvider } from '@/components/ui/toast-notification';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <GlobalProvider>
            <DataProvider>
                <ToastProvider>
                    <ErrorBoundary>
                        <AppLayout>{children}</AppLayout>
                    </ErrorBoundary>
                </ToastProvider>
            </DataProvider>
        </GlobalProvider>
    );
}
