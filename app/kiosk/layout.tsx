"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import KioskHeader from "@/app/kiosk/kiosk-services/components/KioskHeader";
import KioskBackButton from "@/components/reusables/KioskBackButton";

export default function MainKioskLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [scale, setScale] = useState(1);
    const [isLandscape, setIsLandscape] = useState(false);
    const [mounted, setMounted] = useState(false);

    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get the selected patient type from the URL
    const patientType = searchParams.get("type");

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            const landscape = width > height;

            setIsLandscape(landscape);

            const virtualWidth = landscape ? 1920 : 1080;
            const virtualHeight = landscape ? 1080 : 1920;

            const scaleX = width / virtualWidth;
            const scaleY = height / virtualHeight;

            setScale(Math.min(scaleX, scaleY));
            setMounted(true);
        };

        updateScale();

        window.addEventListener("resize", updateScale);
        window.addEventListener("orientationchange", updateScale);

        return () => {
            window.removeEventListener("resize", updateScale);
            window.removeEventListener("orientationchange", updateScale);
        };
    }, []);

    const virtualWidth = isLandscape ? 1920 : 1080;
    const virtualHeight = isLandscape ? 1080 : 1920;

    /*
     * Back button is ONLY allowed on these two pages:
     *
     * /kiosk/kiosk-services
     * /kiosk/kiosk-cubicle-selection
     */
    const shouldShowBackButton =
        pathname === "/kiosk/kiosk-services" ||
        pathname === "/kiosk/kiosk-cubicle-selection" ||
        pathname === "/kiosk/consultation-category";

    /*
     * Determine where the back button should go.
     * Preserve the patient type when going backward.
     */
    let backHref: string | undefined = undefined;

    if (pathname === "/kiosk/kiosk-services") {
        backHref = "/kiosk/kiosk-new-old-selection";
    }

    if (pathname === "/kiosk/kiosk-cubicle-selection") {
        backHref = patientType
            ? `/kiosk/kiosk-services?type=${encodeURIComponent(patientType)}`
            : "/kiosk/kiosk-services";
    }

    if (pathname === "/kiosk/consultation-category") {
        const serviceId = searchParams.get("serviceId");
        const params = new URLSearchParams();
            if (patientType) params.set("type", patientType);
            if (serviceId) params.set("serviceId", serviceId);
        const query = params.toString();
        backHref = `/kiosk/kiosk-services${query ? `?${query}` : ""}`;
    }

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center overflow-hidden bg-white transition-opacity duration-300 ${
                mounted ? "opacity-100" : "opacity-0"
            }`}
        >
            <div
                className="relative flex-shrink-0 overflow-hidden"
                style={{
                    width: `${virtualWidth}px`,
                    height: `${virtualHeight}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                }}
            >
                <div className="relative flex h-full w-full flex-col overflow-hidden">

                    {/* Back Button */}
                    {shouldShowBackButton && backHref && (
                        <KioskBackButton href={backHref} />
                    )}

                    {/* Main Content */}
                    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {children}
                    </main>

                    {/* Bottom Header / Footer */}
                    <div className="flex-shrink-0">
                        <KioskHeader />
                    </div>

                </div>
            </div>
        </div>
    );
}