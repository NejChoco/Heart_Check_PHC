"use client";

import { useEffect, useState } from "react";
import CubicleHeader from "@/app/kiosk/kiosk-cubicle-selection/components/CubicleHeader";

export default function KioskNewOldSelectionLayout({ children }: { children: React.ReactNode }) {
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

        const initialUpdate = () => {
            requestAnimationFrame(updateScale);
            setTimeout(updateScale, 50);
        };

        initialUpdate();
        window.addEventListener("resize", updateScale);
        window.addEventListener("orientationchange", updateScale);
        return () => {
            window.removeEventListener("resize", updateScale);
            window.removeEventListener("orientationchange", updateScale);
        };
    }, []);

    return (
        <div className={`w-screen h-screen overflow-hidden flex items-center justify-center bg-white relative transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex-shrink-0 z-10 transition-transform duration-300 ease-in-out"
                style={{
                    width: isLandscape ? '1920px' : '1080px',
                    height: isLandscape ? '1080px' : '1920px',
                    transform: `scale(${scale})`,
                    transformOrigin: "center center"
                }}
            >
                <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">

                    <main className="flex flex-1 min-h-0 items-center justify-center overflow-hidden">
                        {/* Header + Cubicle Cards as ONE GROUP, just like services page */}
                        <div
                            className={
                                isLandscape
                                    ? "flex w-[55%] flex-col items-center justify-center"
                                    : "flex w-full flex-col items-center justify-center"
                            }
                        >
                            <CubicleHeader />

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