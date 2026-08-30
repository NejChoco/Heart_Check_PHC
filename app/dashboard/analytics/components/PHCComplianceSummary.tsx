"use client";

import { useState, useMemo } from "react";
import AnalyticsMetricCards from "@/components/reusables/analyticsMetricCards";

interface PHCComplianceData {
  waiting_time_le: number;
  waiting_time_gt: number;
  evaluate_le: number;
  evaluate_gt: number;
  examine_treat_le: number;
  examine_treat_gt: number;
  carryout_le: number;
  carryout_gt: number;
  avg_total_waiting_time_min: number;
  patients_seen: number;
  opd_hours: number;
  thresholds_min: {
    waiting_time: number;
    evaluate: number;
    examine_treat: number;
    carryout: number;
  };
}

interface Props {
  data: PHCComplianceData | undefined | null;
}

function formatMinutesToHMS(totalMinutes: number | undefined | null): string {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes)) {
    return "—";
  }
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatThresholdLabel(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60} hrs`;
  if (minutes > 60) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}.${Math.round((mins / 60) * 100)} hrs`;
  }
  return `${minutes} mins`;
}

function ThresholdRow({
  label,
  thresholdLabel,
  le,
  gt,
}: {
  label: string;
  thresholdLabel: string;
  le: number;
  gt: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {label} ≤ {thresholdLabel} =
        </span>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{le}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {label} &gt; {thresholdLabel} =
        </span>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{gt}</span>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-base font-extrabold text-red-500">{value}</span>
    </div>
  );
}

export default function PHCComplianceSummary({ data }: Props) {
  // Doctors on duty isn't tracked as structured per-day data yet, so it's
  // a manual input here — same number PHC staff would already know when
  // filling out the paper form. The ratio recalculates live as it's edited.
  const [doctorsOnDuty, setDoctorsOnDuty] = useState<number>(1);

  const patientsSeen = data?.patients_seen ?? 0;
  const opdHours = data?.opd_hours ?? 8;

  const ratioPerHour = useMemo(() => {
    if (!doctorsOnDuty || doctorsOnDuty <= 0 || !opdHours) return 0;
    return Math.round(patientsSeen / (doctorsOnDuty * opdHours));
  }, [patientsSeen, doctorsOnDuty, opdHours]);

  if (!data) {
    return (
      <AnalyticsMetricCards>
        <h2 className="text-xl font-extrabold mb-2 text-gray-800 dark:text-gray-200">
          PHC Tracking Sheet Summary
        </h2>
        <p className="text-sm text-gray-400">No data available for this range.</p>
      </AnalyticsMetricCards>
    );
  }

  const thresholds = data.thresholds_min;

  return (
    <AnalyticsMetricCards>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-200">
            PHC Tracking Sheet Summary
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Mirrors PHC OPD's manual daily tracking form, for direct cross-check.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left + middle: threshold pairs, matches paper form's left two columns */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <div>
            <ThresholdRow
              label="Waiting Time"
              thresholdLabel={formatThresholdLabel(thresholds.waiting_time)}
              le={data.waiting_time_le}
              gt={data.waiting_time_gt}
            />
            <ThresholdRow
              label="Evaluate patients"
              thresholdLabel={formatThresholdLabel(thresholds.evaluate)}
              le={data.evaluate_le}
              gt={data.evaluate_gt}
            />
          </div>
          <div>
            <ThresholdRow
              label="Examine & treat Pts"
              thresholdLabel={formatThresholdLabel(thresholds.examine_treat)}
              le={data.examine_treat_le}
              gt={data.examine_treat_gt}
            />
            <ThresholdRow
              label="Carry out Dr's Orders"
              thresholdLabel={formatThresholdLabel(thresholds.carryout)}
              le={data.carryout_le}
              gt={data.carryout_gt}
            />
          </div>
        </div>

        {/* Right: summary stats, matches paper form's right column */}
        <div className="md:border-l md:border-gray-100 dark:md:border-gray-700/50 md:pl-6">
          <StatBlock
            label="Average Patient's Total Waiting Time"
            value={formatMinutesToHMS(data.avg_total_waiting_time_min)}
          />
          <StatBlock label="Number of Patients Seen" value={patientsSeen} />

          <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-700/50">
            <label htmlFor="doctors-on-duty" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Number of Doctors on Duty
            </label>
            <input
              id="doctors-on-duty"
              type="number"
              min={1}
              value={doctorsOnDuty}
              onChange={(e) => setDoctorsOnDuty(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 text-right text-base font-extrabold text-red-500 bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
          </div>

          <StatBlock label="Patient to Doctor Ratio Per Hour" value={ratioPerHour} />

          <p className="text-[10px] text-gray-400 mt-2 leading-snug">
            Doctors on duty is a manual entry — ratio recalculates automatically.
          </p>
        </div>
      </div>
    </AnalyticsMetricCards>
  );
}