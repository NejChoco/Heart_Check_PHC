'use client';

interface Props {
  isOpen: boolean;
  titleEng: string;
  titleFil: string;
  messageFil: string;
  messageEng: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
  phone: string;
}

export default function ConfirmationModal({
  isOpen,
  phone,
  titleEng,
  titleFil,
  messageFil,
  messageEng,
  confirmText = 'Magpatuloy - Continue',
  cancelText = 'Bumalik - Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
}: Props) {
  if (!isOpen) return null;

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] p-8 md:p-12 max-w-4xl w-full shadow-2xl">
        <h2 className="mb-4 text-center flex flex-col gap-1 mb-8">
          {/* Filipino Title: Larger, bolder, darker */}
          <span className="text-[44px] md:text-[44px] font-bold text-black">
            {titleFil}
          </span>
          
          {/* English Title: Smaller, lighter color, perhaps less bold */}
          <span className="text-[38px] md:text-[38px] font-normal text-gray-600">
            {titleEng}
          </span>
        </h2>
        
        {/* message */}
        <div className="flex flex-col border-5 border-dashed border-gray-300 p-4 rounded-[16px] mb-8">
          <p className="text-[32px] md:text-[32px] text-black gap-1 leading-relaxed text-center font-bold">
            {messageFil}
          </p>

            <div className="h-[2px] w-full bg-gray-300 rounded my-5" />

          <p className="text-[32px] md:text-[32px] text-gray-600  leading-relaxed text-center font-extralight">
            {messageEng}
          </p>
          <p className="text-[38px] md:text-[38px] text-black font-bold  leading-relaxed text-center">
            {formatPhone(phone)}
          </p>
        </div>


        <div className="flex gap-4 flex-col md:flex-row">
          <button
            onClick={onCancel}
            className="flex-1 py-3 md:py-4 px-4 rounded-[16px] font-bold text-[24px] md:text-[24px]
              bg-white border-gray-400 border-[3px] text-gray-400 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 md:py-4 px-4 rounded-[16px]  font-bold text-[24px] md:text-[24px] text-white
              transition-all active:scale-95 ${
              isDangerous
                ? 'bg-[#7f0407] hover:bg-red-600'
                : 'bg-[#7f0407] hover:bg-blue-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
