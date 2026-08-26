"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function OPDScreeningCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceId = searchParams.get("serviceId");
  const patientType = searchParams.get("type");

  const chooseCategory = (subcategory: "Adult" | "Pedia") => {
    const params = new URLSearchParams();

    if (serviceId) params.set("serviceId", serviceId);
    if (patientType) params.set("type", patientType);
    params.set("subcategory", subcategory);

    router.push(`/kiosk/sms-input?${params.toString()}`);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-8">
      <div className="text-center">
        <p className="text-black font-black text-[40px]">
          Piliin ang naaayon sa iyong edad:(notfinaldesign)
        </p>
        <p className="text-gray-600 text-[28px]">
          Select based on your age
        </p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-2 gap-8">
        <button
          type="button"
          onClick={() => chooseCategory("Adult")}
          className="rounded-[16px] border-2 border-gray-300 bg-white px-8 py-16 text-[38px] font-black text-black transition-all active:scale-95"
        >
          Adult
          <br />
          (19 Pataas)
        </button>

        <button
          type="button"
          onClick={() => chooseCategory("Pedia")}
          className="rounded-[16px] border-2 border-gray-300 bg-white px-8 py-16 text-[38px] font-black text-black transition-all active:scale-95"
        >
          Pedia
          <br />
          (18 Pababa)
        </button>
      </div>
    </div>
  );
}