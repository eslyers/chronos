// src/app/app/layout.tsx
import AppLayout from '@/components/AppLayout';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import { DataProvider } from '@/lib/context/DataContext';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <GlobalProvider>
            <DataProvider>
                <AppLayout>{children}</AppLayout>
            </DataProvider>
        </GlobalProvider>
    );
}