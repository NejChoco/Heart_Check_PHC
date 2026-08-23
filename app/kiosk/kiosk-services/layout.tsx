"use client";

import { useEffect, useState } from "react";
import KioskBanner from "@/app/kiosk/kiosk-services/components/KioskBanner";
import KioskBackButton from "../../../components/reusables/KioskBackButton";

const backRoute: Record<string, string> = {
    "/kiosk/kiosk-services": "/kiosk/kiosk-new-old-selection",
};

export default function KioskLayout({children,}: {children: React.ReactNode;}) {
    const [scale, setScale] = useState(1);
    const [isLandscape, setIsLandscape] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const updateScale = () => {
            const landscape = window.innerWidth > window.innerHeight;

            setIsLandscape(landscape);

            const virtualWidth = landscape ? 1920 : 1080;
            const virtualHeight = landscape ? 1080 : 1920;

            const scaleX = window.innerWidth / virtualWidth;
            const scaleY = window.innerHeight / virtualHeight;

            setScale(Math.min(scaleX, scaleY) || 1);
            setMounted(true);
        };

        updateScale();

        window.addEventListener("resize", updateScale);
        window.addEventListener("orientationchange", updateScale);

        return () => {
            window.removeEventListener("resize", updateScale);
            window.removeEventListener(
                "orientationchange",
                updateScale
            );
        };
    }, []);

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center overflow-hidden bg-white transition-opacity duration-300 ${
                mounted ? "opacity-100" : "opacity-0"
            }`}
        >
            {/* Virtual Kiosk Screen */}
            <div
                className="relative flex-shrink-0 overflow-hidden"
                style={{
                    width: isLandscape ? "1920px" : "1080px",
                    height: isLandscape ? "1080px" : "1920px",
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                }}
            >
                <div className="relative flex h-full w-full flex-col overflow-hidden">

                    {/* 
                        Content area.
                        Bottom padding leaves room for the
                        shared KioskHeader.
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
        </div>
    );
}