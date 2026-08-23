"use client";

import Link from "next/link";
import { Service } from "@/types/Services";
import ConfirmationModal from "@/components/modals/ConfirmationModal";

interface Props {
  service: Service;
  disabled: boolean;
  onContinue: () => void;
  onSkip: () => void;
  phone: string;
  showContinueModal: boolean;
  showSkipModal: boolean;
  onContinueConfirm: () => void;
  onSkipConfirm: () => void;
  onContinueCancel: () => void;
  onSkipCancel: () => void;
  href: string;
  label?: string;
}


export default function ContinueButton({
  disabled, onContinue, onSkip, service, phone, showContinueModal, showSkipModal, onContinueConfirm, onSkipConfirm, onContinueCancel, onSkipCancel, href, label
}: Props) {
  return (
    <div className="w-full flex flex-col gap-[1.5vh] mt-auto">
      <button
        onClick={disabled ? undefined : onContinue}
        disabled={disabled}
        className="w-full font-bold text-white disabled:opacity-50 disabled:pointer-events-none py-[1.6vh] rounded-[16px] text-[min(3.2vh,40px)] active:scale-[0.98] transition-all bg-[#7f0407]"
      >
        Magpatuloy - Continue
      </button>


      {/* back button on new patient doesn't go back to the new patient kiosk service selection */}
      <div className="flex gap-[2vw]">
        <Link 
          href={href} 
          className="flex-1 text-center py-[1vh] border-[0.3vh] border-gray-400 text-gray-500 font-bold rounded-[16px] text-[min(2vh,40px)] active:scale-95 transition-all">
          Bumalik - Cancel
        </Link>

        <button onClick={onSkip} className="flex-1 text-center py-[1vh] border-[0.3vh] border-gray-400 text-gray-500 font-bold rounded-[16px] text-[min(2vh,40px)] active:scale-95 transition-all">
          Laktawan-Skip
        </button>
      </div>

      <ConfirmationModal
        isOpen={showContinueModal}
        titleFil="Magpatuloy?"
        titleEng="Continue?"
        messageFil="Tama ba ang inyong numero?"
        messageEng="Is this your correct phone number?"
        confirmText="Oo, Tama - Yes, Correct"
        cancelText="Hindi, Baguhin - No, Change"
        phone={phone}
        onConfirm={onContinueConfirm}
        onCancel={onContinueCancel}
      />
      <ConfirmationModal
        isOpen={showSkipModal}
        titleFil="Walang Notipikasyon"
        titleEng="No Notification"
        messageFil="Kung laktawan ninyo ang numero, hindi kayo makakatanggap ng SMS notipikasyon. Magpatuloy pa rin?"
        messageEng="If you skip the number, you will not receive SMS notifications. Continue anyway?"
        phone={phone}
        confirmText="Oo, Magpatuloy - Yes, Continue"
        cancelText="Bumalik - Go Back"
        onConfirm={onSkipConfirm}
        onCancel={onSkipCancel}
        isDangerous={true}
      />
    </div>
  );
}