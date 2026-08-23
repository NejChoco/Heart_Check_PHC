"use client";

import Link from "next/link";

interface KioskBackButtonProps {
    href: string;
    label?: string;
}

export default function KioskBackButton({ href, label }: KioskBackButtonProps) {
    return (
        <Link
            href={href}
            className="absolute left-6 top-6 z-50 rounded-[16px] bg-[#7f0407] px-4 py-2 text-[28px] font-bold text-white transition-all active:scale-95"
        >
            Bumalik - Back
        </Link>
    );
}