'use client';
import { Patient } from '@/types/Types';

type RegistrationCounterSectionProps = {
  patients: Patient[];
  draggedPatient: Patient | null;
  dragOverCounter: number | null;
  onDragStart: (e: React.MouseEvent, patient: Patient) => void;
  onRelease: (patient: Patient) => void;
};

const DEFAULT_COUNTERS = [1, 2, 3, 4, 5];

export function RegistrationCounterSection({
  patients,
  draggedPatient,
  dragOverCounter,
  onDragStart,
  onRelease,
}: RegistrationCounterSectionProps) {

  const counters = DEFAULT_COUNTERS;

  return (
    <div className="bg-white border-2 border-blue-100 rounded-3xl shadow-sm p-5 mt-4 overflow-x-auto">
      <h2 className="text-blue-500 font-semibold text-xs mb-3 tracking-widest uppercase flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block"></span>
        Registration Counters
        <span className="text-xs text-gray-400 font-normal ml-2">(Drag to reassign counter)</span>
      </h2>
      <div className="grid grid-cols-5 gap-3 min-w-[600px]">
        {counters.map(counterNum => {
          const counterPatients = patients
            .filter(p => p.counter === counterNum)
            .sort((a, b) =>
              new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
            );
          const isOver = dragOverCounter === counterNum;

          return (
            <div
              key={counterNum}
              data-counter={counterNum}
              className={`min-h-24 rounded-2xl border-2 p-3 flex flex-col gap-2 transition ${
                isOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Counter {counterNum}
              </span>

              {counterPatients.length === 0 && (
                <p className="text-gray-300 text-xs text-center mt-2">—</p>
              )}

              {counterPatients.map((p, i) => (
                <div
                  key={p.id}
                  onMouseDown={(e) => onDragStart(e, p)}
                  className={`border rounded-xl p-2 flex flex-col gap-1 select-none cursor-grab ${
                    draggedPatient?.id === p.id ? 'opacity-40 cursor-grabbing' : ''
                  } ${
                    i === 0
                      ? 'border-[#cc3535] bg-white'
                      : 'border-gray-200 bg-white'
                  }`}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  <span className={`font-black text-base ${i === 0 ? 'text-[#cc3535]' : 'text-gray-400'}`}>
                    {p.patientNum}
                  </span>
                  <span className="text-gray-400 text-xs">{p.service}</span>
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-green-400' : 'bg-gray-200'}`} />

                  {i === 0 && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onRelease(p)}
                      className="mt-1 text-[10px] font-semibold uppercase tracking-wide bg-blue-500 text-white rounded-lg py-1.5 hover:bg-blue-600 transition"
                    >
                      Send to Queue →
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}