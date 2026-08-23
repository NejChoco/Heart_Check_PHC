"use client";

interface Stage {
  stage_key: string;
  stage_label: string;
  avg_minutes: number;
  patient_count: number;
  level: "Normal" | "Elevated" | "Overwhelmed" | "No Data";
  reason: string;
}

interface Props {
  stages: Stage[];
}

const LEVEL_BADGE: Record<string, string> = {
  Normal: "bg-green-500/15 text-green-400 border border-green-500/30",
  Elevated: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  Overwhelmed: "bg-red-500/15 text-red-400 border border-red-500/30",
  "No Data": "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

export default function BottleneckStageTable({ stages }: Props) {
  if (!stages || stages.length === 0) {
    return (
      <div className="p-6 rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10">
        <h2 className="text-lg font-bold text-gray-200 mb-1">Queue Stage Breakdown</h2>
        <p className="text-sm text-gray-400">No stage data available for the selected range.</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10">
      <h2 className="text-lg font-bold text-gray-200 mb-1">Queue Stage Breakdown</h2>
      <p className="text-sm text-gray-400 mb-5">
        Where patients spend the most time, kiosk through carryout — with severity and reasoning per stage.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/10">
              <th className="py-3 pr-4 font-semibold">Stage</th>
              <th className="py-3 pr-4 font-semibold">Avg. Time</th>
              <th className="py-3 pr-4 font-semibold">Patients</th>
              <th className="py-3 pr-4 font-semibold">Level</th>
              <th className="py-3 pr-4 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <tr
                key={stage.stage_key}
                className="border-b border-white/5 last:border-0 align-top"
              >
                <td className="py-4 pr-4 font-semibold text-gray-200 whitespace-nowrap">
                  {stage.stage_label}
                </td>
                <td className="py-4 pr-4 text-gray-300 whitespace-nowrap">
                  {stage.level === "No Data" ? "—" : `${stage.avg_minutes} min`}
                </td>
                <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">
                  {stage.patient_count}
                </td>
                <td className="py-4 pr-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${LEVEL_BADGE[stage.level]}`}>
                    {stage.level}
                  </span>
                </td>
                <td className="py-4 pr-4 text-gray-400 leading-snug max-w-md">
                  {stage.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}