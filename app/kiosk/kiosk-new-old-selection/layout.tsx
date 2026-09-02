"use client";

import { useEffect, useState } from "react";
import KioskTitle from "@/app/kiosk/kiosk-new-old-selection/components/KioskTitle";
import PatientTypeBanner from "@/app/kiosk/kiosk-new-old-selection/components/PatientTypeBanner";

export default function KioskNewOldSelectionLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isLandscape, setIsLandscape] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const updateOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
            setMounted(true);
        };

        updateOrientation();

        window.addEventListener("resize", updateOrientation);
        window.addEventListener("orientationchange", updateOrientation);

        return () => {
            window.removeEventListener("resize", updateOrientation);
            window.removeEventListener("orientationchange", updateOrientation);
        };
    }, []);

    return (
        <div
            className={`fixed inset-0 flex h-dvh w-dvw items-center justify-center overflow-hidden bg-white transition-opacity duration-300 ${
                mounted ? "opacity-100" : "opacity-0"
            }`}
        >
            <main className="flex h-full w-full items-center justify-center overflow-hidden">

                {isLandscape ? (
                    /* =========================
                       LANDSCAPE
                       ========================= */
                    <div className="flex w-[90%] max-w-[1750px] items-center justify-center gap-[5vw]">

                        {/* LEFT: TITLE + IMAGE */}
                        <div className="flex w-[45%] flex-col items-center justify-center">
                            <KioskTitle isLandscape={true} />
                        </div>

                        {/* RIGHT: BANNER + CARDS */}
                        <div className="flex w-[55%] flex-col items-center justify-center">
                            <PatientTypeBanner />

                            <div className="w-full">
                                {children}
                            </div>
                        </div>

                    </div>
                ) : (
                    /* =========================
                       PORTRAIT
                       ========================= */
                    <div className="flex w-full flex-col items-center justify-center px-[5vw]">

                        {/* TITLE + IMAGE */}
                        <KioskTitle isLandscape={false} />

                        {/* BANNER */}
                        <PatientTypeBanner />

                        {/* CARDS */}
                        <div className="w-full">
                            {children}
                        </div>

                    </div>
                )}

            </main>
        </div>
    );
}