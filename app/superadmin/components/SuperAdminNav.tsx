'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuperAdminNav() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        getUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="bg-red-500 px-6 py-3 flex justify-between items-center">
            <span className="text-white font-semibold">Super Admin</span>
            <div className="flex items-center gap-4">
                <span className="text-white/80 text-sm">{userEmail}</span>
                
                <Link href="/superadmin/customization" className="text-white/80 hover:text-white text-sm">
                    customization
                </Link>
                
                <button onClick={handleSignOut} className="text-white/80 hover:text-white text-sm">
                    Sign Out
                </button>
            </div>
        </div>
    );
}