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
    const [mounted, setMounted] = useState(false);

    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get the selected patient type from the URL
    const patientType = searchParams.get("type");

    useEffect(() => {
        setMounted(true);
    }, []);

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
            className={`fixed inset-0 flex h-dvh w-dvw flex-col overflow-hidden bg-white transition-opacity duration-300 ${
                mounted ? "opacity-100" : "opacity-0"
            }`}
        >
            {/* Back Button */}
            {shouldShowBackButton && backHref && (
                <KioskBackButton href={backHref} />
            )}

            {/* Main Content — fills all remaining space, no fixed dimensions */}
            <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                {children}
            </main>

            {/* Bottom Header / Footer — sized by its own content, not a virtual canvas */}
            <div className="w-full flex-shrink-0">
                <KioskHeader />
            </div>
        </div>
    );
}