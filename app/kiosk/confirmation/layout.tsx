"use client";

import { useEffect, useState } from "react";

export default function ConfirmationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div
            className={`flex h-dvh w-dvw items-center justify-center overflow-hidden bg-white transition-opacity duration-300 ${
                mounted ? "opacity-100" : "opacity-0"
            }`}
        >
            <main className="flex h-full w-full flex-col items-center">
                {children}
            </main>
        </div>
    );
}