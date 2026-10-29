import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: dashboard().url }]}>
            <Head title="Dashboard" />
            <div className="p-4">Welcome</div>
        </AppLayout>
    );
}
