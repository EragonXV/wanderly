import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import RegisterForm from '@/components/auth/RegisterForm';
import { authOptions } from '@/lib/auth/authOptions';

export default async function RegisterPage() {
    const session = await getServerSession(authOptions);

    if (session?.user) {
        redirect('/dashboard');
    }

    return <RegisterForm />;
}
