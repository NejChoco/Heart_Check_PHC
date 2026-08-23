import { Service } from "@/types/Services";

interface Props { service: Service; }

export default function SMSInstruction({ service }: Props) {

    return (
        <div
            className="w-full border-dashed border-[0.4vh] border-gray-300 p-[2vh] bg-white text-center rounded-[16px]"
        >
            <p className="font-black text-black leading-tight text-[min(2.5vh,36px)]">
                Pakilagay ang inyong numero ng telepono sa format na ito:
            </p>
            <div className="h-[2px] w-full bg-gray-300 rounded my-5" />
            <p className="font-black text-[#888] leading-tight text-[min(2.5vh,36px)]">
                Please enter your phone number in this format:
            </p>
        </div>
    );
}