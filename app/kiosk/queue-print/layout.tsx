// make this use the shared layout from the kiosk

"use client";

import PrintHeader from "@/app/kiosk/queue-print/components/PrintHeader";
import PrintFooter from "@/app/kiosk/queue-print/components/PrintFooter";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-white flex flex-col">
      <PrintHeader />
      <main className="flex-1 min-h-0 w-full flex items-center justify-center p-4 md:p-8">
        {children}
      </main>
      <PrintFooter />
    </div>
  );
}