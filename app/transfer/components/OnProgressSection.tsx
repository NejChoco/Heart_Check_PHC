'use client';
import { Patient } from '@/types/Types';
import { ElapsedTimer } from './ElapsedTimer';
import { MAX_PATIENTS_PER_CUBICLE } from '../lib/constants';

type OnProgressSectionProps = {
  patients: Patient[];
  isDraggable: boolean;
  selectedCategory: string | null;
  draggedPatientId?: number;
  onDragStart: (e: React.MouseEvent, patient: Patient) => void;
  onSpeak: (text: string, patientId: number) => void;
  onAssignNow: (patient: Patient) => void;
  speakingId?: number | null;
  warnAfterSeconds?: number;
};

export function OnProgressSection({
  patients,
  isDraggable,
  selectedCategory,
  draggedPatientId,
  onDragStart,
  onSpeak,
  onAssignNow,
  speakingId,
  warnAfterSeconds,
}: OnProgressSectionProps) {
  return (
    <div className="bg-white border-2 border-green-100 rounded-3xl shadow-sm p-5">
      <h2 className="text-green-500 font-semibold text-xs mb-3 tracking-widest uppercase flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"></span>
        On Progress Queue ({patients.length})
        {isDraggable && (
          <span className="text-xs text-gray-400 font-normal ml-2">(Click and drag to cubicles below)</span>
        )}
        {!isDraggable && (
          <span className="text-xs text-blue-400 font-normal ml-2">(Auto-assigning - Max {MAX_PATIENTS_PER_CUBICLE} per cubicle)</span>
        )}
      </h2>
      {patients.length === 0 && (
        <p className="text-gray-300 text-xs">No patients in queue</p>
      )}
      {patients.length > 0 && (
        <div className="overflow-y-auto max-h-[11rem]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {patients.map((p, index) => (
              <div
                key={p.id}
                onMouseDown={isDraggable ? (e) => onDragStart(e, p) : undefined}
                className={`border rounded-2xl p-3 flex flex-col gap-2 select-none ${
                  index < 5
                    ? 'border-green-200 bg-green-50'
                    : 'border-yellow-200 bg-yellow-50'
                } ${isDraggable ? (draggedPatientId === p.id ? 'opacity-40 cursor-grabbing' : 'cursor-grab') : ''}`}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#cc3535] font-black text-lg">{p.patientNum}</span>
                  <ElapsedTimer startedAt={p.progress_started_at} warnAfterSeconds={warnAfterSeconds} />
                </div>
                <span className="text-gray-500 text-xs font-medium">{p.service}</span>
                <div className="text-xs">
                  {index < 5 ? (
                    <span className="text-green-600">Position: {index + 1} (Next)</span>
                  ) : (
                    <span className="text-yellow-600">Position: {index + 1} (Waiting)</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const num = p.patientNum;
                      const letter = num.charAt(0);
                      const digits = parseInt(num.slice(1), 10).toString();
                      onSpeak(`Number ${letter} ${digits}, Number ${letter} ${digits}, go to the ${selectedCategory || 'consultation'} area`, p.id);
                    }}
                    disabled={speakingId === p.id}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-xl text-xs font-medium transition ${
                      speakingId === p.id ? 'bg-blue-100 text-blue-300 cursor-not-allowed' : 'bg-blue-50 hover:bg-blue-100 text-blue-500'
                    }`}
                  >
                    <i className={`bx ${speakingId === p.id ? 'bx-loader-alt animate-spin' : 'bxs-volume-full'} text-xs`}></i>
                    <span>Call</span>
                  </button>

                  {isDraggable && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignNow(p);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-xl text-xs font-medium transition bg-green-50 hover:bg-green-100 text-green-600"
                    >
                      <i className="bx bx-check-circle text-xs"></i>
                      <span>Assign</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}