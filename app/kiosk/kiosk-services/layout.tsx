"use client";

import { useEffect, useState } from "react";
import KioskBanner from "@/app/kiosk/kiosk-services/components/KioskBanner";
import KioskBackButton from "../../../components/reusables/KioskBackButton";

const backRoute: Record<string, string> = {
    "/kiosk/kiosk-services": "/kiosk/kiosk-new-old-selection",
};

export default function KioskLayout({
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
            <div className="relative flex h-full w-full flex-col overflow-hidden">

                {/*
                    Content area.
                    Bottom padding leaves room for the
                    shared KioskHeader (fixed-height footer
                    rendered by the parent layout).
                */}
                <main
                    className={`flex flex-1 min-h-0 items-center justify-center overflow-hidden ${
                        isLandscape
                            ? "pb-[120px]"
                            : "pb-[140px]"
                    }`}
                >
                    {/* Banner + Service Cards as ONE GROUP */}
                    <div
                        className={
                            isLandscape
                                ? "flex w-[55%] flex-col items-center justify-center"
                                : "flex w-full flex-col items-center justify-center"
                        }
                    >
                        {/* Banner */}
                        <KioskBanner />

                        {/* Service Cards */}
                        <div className="w-full">
                            {children}
                        </div>
                    </div>
                </main>

            </div>
        </div>
    );
}