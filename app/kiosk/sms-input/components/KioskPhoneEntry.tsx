// this file is where the data insertion to the database happens

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTimestamp } from "@/lib/logger";
import { Service } from "@/types/Services";
import { sendSMS } from '@/app/actions/sendSMS';
import PhoneInput from "./PhoneInput";
import NumPad from "./NumPad";
import ContinueButton from "./ContinueButton";
import SMSInstruction from "./SMSInstruction";

interface Props {
  service: Service;
  patientNum?: string;
  preferredCubicleNums?: string;
  subcategory?: string;
}

const MAX = 11;

const SERVICE_PREFIXES: Record<string, string> = {
  'Consultation': 'C', 'OPD Card': 'O', 'Refill Prescription': 'R', 'ECG': 'E',
  'Warfarin': 'W', 'OPD Reschedule': 'S', 'Benzathine': 'B', 'OPD Screening': 'P',
};

const createPatientRecord = async (
  service: Service,
  subcategory?: string,
  preferredCubicleNums?: string[] | null
) => {
try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const serviceName = service.label_en;
    const prefix = SERVICE_PREFIXES[serviceName] ?? 'C';

    const { data: lastPatient } = await supabase.from('patients').select('patientNum')
      .eq('service', serviceName).gte('created_at', startOfDay).lt('created_at', endOfDay)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    let nextNum = 1;
    if (lastPatient?.patientNum) {
      const lastNum = parseInt(lastPatient.patientNum.replace(/\D/g, ''));
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    const patientNum = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const { data: lastQueue } = await supabase
      .from("patients")
      .select("queue_position")
      .order("queue_position", { ascending: false })
      .limit(1);

    const nextQueuePosition =
      (lastQueue?.[0]?.queue_position ?? 0) + 1;

    const { data, error } = await supabase
      .from("patients")
      .insert({
        patientNum,
        service: serviceName,
        status: "On Progress",
        phoneNum: null,
        cubicleNum: null,
        queue_position: nextQueuePosition,
        subcategory: subcategory ?? null,
        preferredCubicleNums,
        is_historical: false, // live kiosk row — explicit, not relying on column default
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`${getTimestamp()} [DB INSERT] New Patient Created with On Progress status:`, { id: data?.id, created_at: data?.created_at, patientNum: data?.patientNum, phoneNum: data?.phoneNum, service: data?.service });
    return patientNum;
  } catch (err) {
    console.error(`${getTimestamp()} [DB INSERT ERROR] Failed to create patient record for service "${service.label_en}":`, err);
    throw err;
  }
};

export default function KioskPhoneEntry({
  service,
  patientNum: initialPatientNum,
  preferredCubicleNums,
  subcategory,
}: Props) {
  const preferredList = preferredCubicleNums ? preferredCubicleNums.split(",") : null;
  const [phone, setPhone] = useState("");
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [patientNum, setPatientNum] = useState<string | undefined>(initialPatientNum);
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientType = searchParams.get("type");
  const cancelHref = patientType
    ? `/kiosk/kiosk-services?type=${encodeURIComponent(patientType)}`
    : "/kiosk/kiosk-services";

  const addDigit = (digit: string) => { if (phone.length < MAX) setPhone((p) => p + digit); };
  const deleteLast = () => setPhone((p) => p.slice(0, -1));

    const handleContinueConfirm = async () => {
      setShowContinueModal(false);
      try {
        let finalPatientNum = patientNum;
        if (!finalPatientNum)
      finalPatientNum = await createPatientRecord(
        service,
        subcategory,
        preferredList
      );

      await supabase
        .from("patients")
        .update({
          phoneNum: parseInt(phone, 10),
          preferredCubicleNums: preferredList,
          subcategory: subcategory ?? null,
        })
        .eq("patientNum", finalPatientNum);

        router.push(`/kiosk/queue-print?patientNum=${finalPatientNum}&serviceId=${service.id}`);
       } catch (e) {
      alert(JSON.stringify(e));

      console.log("ERROR:", e);

      if (e instanceof Error) {
        console.log("Message:", e.message);
        console.log("Stack:", e.stack);
      } else {
        console.log("Unknown error:", e);
      }
    }
      };

const handleSkipConfirm = async () => {
  setShowSkipModal(false);

  try {
    let finalPatientNum = patientNum;

    if (!finalPatientNum) {
      finalPatientNum = await createPatientRecord(
        service,
        subcategory,
        preferredList
      );
    }

    await supabase
      .from("patients")
      .update({
        subcategory: subcategory ?? null,
        preferredCubicleNums: preferredList,
      })
      .eq("patientNum", finalPatientNum);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data } = await supabase
        .from('patients')
        .select()
        .eq('patientNum', finalPatientNum)
        .gte('created_at', startOfDay)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log(`${getTimestamp()} [SMS SKIP] Phone SMS skipped:`, { id: data?.id, created_at: data?.created_at, patientNum: data?.patientNum, phoneNum: data?.phoneNum, service: data?.service });
      router.push(`/kiosk/queue-print?patientNum=${finalPatientNum}&serviceId=${service.id}`);
    } catch (e) {
      console.error(`${getTimestamp()} [SMS SKIP ERROR] Failed to skip SMS for service "${service.label_en}":`, e);
    }
  };

  return (
    <div className="h-full min-h-0 w-full grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4 md:gap-6 p-[2vh] overflow-hidden bg-white landscape:grid-cols-[1.2fr_1fr] landscape:grid-rows-[auto_minmax(0,1fr)_auto] landscape:gap-x-12 landscape:gap-y-6">

      <div className="flex w-full flex-col gap-[1.5vh] landscape:col-start-1 landscape:row-start-1 landscape:row-span-2 landscape:justify-center landscape:items-start">
        <SMSInstruction service={service} />
        <PhoneInput phone={phone} onDelete={deleteLast} service={service} />
      </div>

      <div className="flex h-full w-full items-center justify-center portrait:pt-[6vh] portrait:pb-[4vh] landscape:items-center landscape:justify-end landscape:pt-[8vh] landscape:pb-[4vh] landscape:col-start-2 landscape:row-start-1 landscape:row-span-2 landscape:px-4 lg:landscape:px-8">
        <NumPad onDigit={addDigit} />
      </div>

      <div className="flex-none w-full landscape:col-start-1 landscape:col-end-3 landscape:row-start-3">
        <ContinueButton
          disabled={phone.length !== MAX}
          onContinue={() => setShowContinueModal(true)}
          onSkip={() => setShowSkipModal(true)}
          service={service}
          phone={phone}
          showContinueModal={showContinueModal}
          showSkipModal={showSkipModal}
          onContinueConfirm={handleContinueConfirm}
          onSkipConfirm={handleSkipConfirm}
          onContinueCancel={() => setShowContinueModal(false)}
          onSkipCancel={() => setShowSkipModal(false)}
          href={cancelHref}
        />
      </div>
    </div>
  );
}