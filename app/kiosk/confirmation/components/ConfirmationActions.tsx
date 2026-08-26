'use client';
import { useRouter } from 'next/navigation';
import { getTimestamp } from '@/lib/logger';
import { Service } from '@/types/Services';

interface Props {
  service: Service;
  patientType?: "new" | "old";
  onCancel?: () => void;
  onContinue?: () => void;
}

export default function ConfirmationActions({
  service,
  patientType,
  onCancel,
  onContinue,
}: Props) {
  const router = useRouter();

  const handleContinue = () => {
    onContinue?.();

    const isConsultation = service.label_en?.toLowerCase() === "consultation";
    const isOPDScreening = service.label_en?.toLowerCase() === "opd screening";

    if (isConsultation) {
      console.log(`${getTimestamp()} [CONFIRMATION ACCEPTED] Consultation service - Redirecting to cubicle selection - ServiceId: ${service.id}`);
      router.push(
        `/kiosk/consultation-category?serviceId=${service.id}${
          patientType ? `&type=${patientType}` : ""
        }`);
      return;
    }

    if (isOPDScreening) {
      console.log(`${getTimestamp()} [CONFIRMATION ACCEPTED] OPD Screening service - Redirecting to category selection - ServiceId: ${service.id}`);
      router.push(
        `/kiosk/opd-screening-category?serviceId=${service.id}${
          patientType ? `&type=${patientType}` : ""
        }`);
      return;
    }

    console.log(`${getTimestamp()} [CONFIRMATION ACCEPTED] Service confirmed - Redirecting to SMS input - ServiceId: ${service.id}`);
    router.push(`/kiosk/sms-input?serviceId=${service.id}`);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(patientType ? `/kiosk/kiosk-services?type=${patientType}` : '/kiosk/kiosk-services');
  };

  return (
    <div className="flex flex-col justify-center w-full mt-2 gap-3">
      <button
        onClick={handleContinue}
        className="w-full py-[15px] text-white text-center text-2xl font-black rounded-[16px] transition-all active:scale-95 shadow-md bg-[#7f0407]">
        Magpatuloy - Continue
      </button>
      <button
        onClick={handleCancel}
        className="w-full py-[15px] border-gray-400 border-[0.3vh] text-center rounded-[16px] font-black text-gray-500 text-2xl transition-all active:scale-95 bg-white">
        Bumalik - Cancel
      </button>
    </div>
  );
}