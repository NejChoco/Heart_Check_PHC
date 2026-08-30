'use client';

import { useEffect, useRef, useState } from 'react';

interface MonthEntry {
  month: number;
  month_label: string;
  patient_count: number;
  bottleneck_stage: string;
  system_status: string;
  avg_total_time_min: number;
}

interface HistoricalContextBannerProps {
  historicalData: any;
  historicalLoading: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  Overwhelmed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Elevated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Normal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'No Data': 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400',
};

function formatDuration(mins: number) {
  const hrs = Math.floor(mins / 60);
  const remMins = Math.round(mins % 60);
  return `${hrs}h ${remMins}m`;
}

const API_BASE = 'http://localhost:8000';

export default function HistoricalContextBanner({
  historicalData,
  historicalLoading,
}: HistoricalContextBannerProps) {
  const [years, setYears] = useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [months, setMonths] = useState<MonthEntry[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [monthsError, setMonthsError] = useState<string | null>(null);

  // Client-side cache so re-selecting a year already viewed this session
  // doesn't refetch from the backend.
  const monthCache = useRef<Record<number, MonthEntry[]>>({});

  // Fetch the list of available years once, on mount.
  useEffect(() => {
    fetch(`${API_BASE}/api/available-years`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const fetchedYears: number[] = json.years || [];
        const sorted = [...fetchedYears].sort((a, b) => b - a);
        setYears(sorted);
        setActiveYear(sorted[0] ?? null);
        setYearsLoading(false);
      })
      .catch(() => {
        setYears([]);
        setYearsLoading(false);
      });
  }, []);

  // Fetch (or reuse cached) months whenever the selected year changes.
  useEffect(() => {
    if (activeYear === null) return;

    if (monthCache.current[activeYear]) {
      setMonths(monthCache.current[activeYear]);
      setMonthsError(null);
      return;
    }

    setMonthsLoading(true);
    setMonthsError(null);

    fetch(`${API_BASE}/api/monthly-breakdown/${activeYear}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const fetchedMonths: MonthEntry[] = json.months || [];
        monthCache.current[activeYear] = fetchedMonths;
        setMonths(fetchedMonths);
        setMonthsLoading(false);
      })
      .catch((err) => {
        setMonthsError(err.message);
        setMonthsLoading(false);
      });
  }, [activeYear]);

  if (historicalLoading) {
    return (
      <div className="bg-white/35 rounded-[28px] border border-white/40 p-6 backdrop-blur-xl dark:bg-gray-900/60 dark:border-gray-700/50">
        <p className="text-sm text-gray-400">Loading historical context...</p>
      </div>
    );
  }

  if (!historicalData) return null;

  const status = historicalData.bottleneck_analysis?.system_status || 'N/A';
  const bottleneckStage = historicalData.bottleneck_analysis?.bottleneck_stage || 'None';
  const avgTotalMins = historicalData.system_time?.avg_total_time ?? 0;
  const forecast = historicalData.computational_forecasting?.next_day_forecast ?? null;
  const bestAlgo = historicalData.computational_forecasting?.best_algorithm;

  const isOverwhelmed = status === 'Overwhelmed';

  return (
    <div className="bg-white/35 rounded-[28px] shadow-[0_10px_40px_rgba(255,120,120,0.06)] border border-white/40 p-8 backdrop-blur-xl dark:bg-gray-900/60 dark:border-gray-700/50 dark:shadow-black/20">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-200">
            No live activity today
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Here's what the historical data shows for this system
          </p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${
            isOverwhelmed
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Typical Bottleneck
          </p>
          <p className="text-lg font-extrabold text-gray-800 dark:text-gray-200">
            {bottleneckStage}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Avg. Total Patient Time
          </p>
          <p className="text-lg font-extrabold text-gray-800 dark:text-gray-200">
            {formatDuration(avgTotalMins)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Next-Day Forecast
          </p>
          <p className="text-lg font-extrabold text-gray-800 dark:text-gray-200">
            {forecast !== null ? `${forecast} patients` : '—'}
            {bestAlgo && (
              <span className="text-xs font-normal text-gray-400 ml-2">via {bestAlgo}</span>
            )}
          </p>
        </div>
      </div>

      {!yearsLoading && years.length > 0 && (
        <div className="border-t border-white/20 dark:border-gray-700/50 pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Monthly Breakdown
            </h3>
            <select
              value={activeYear ?? ''}
              onChange={(e) => setActiveYear(Number(e.target.value))}
              className="text-sm font-semibold bg-white/60 dark:bg-gray-800/80 border border-white/40 dark:border-gray-700/50 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {monthsLoading && (
            <p className="text-sm text-gray-400">Loading {activeYear}...</p>
          )}

          {!monthsLoading && monthsError && (
            <p className="text-sm text-red-400">Couldn't load {activeYear}: {monthsError}</p>
          )}

          {!monthsLoading && !monthsError && months.length === 0 && (
            <p className="text-sm text-gray-400">No records for {activeYear}.</p>
          )}

          {!monthsLoading && !monthsError && months.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/20 dark:border-gray-700/50">
                    <th className="py-2 pr-4 font-semibold">Month</th>
                    <th className="py-2 pr-4 font-semibold">Patients</th>
                    <th className="py-2 pr-4 font-semibold">Typical Bottleneck</th>
                    <th className="py-2 pr-4 font-semibold">Avg. Total Time</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month} className="border-b border-white/10 dark:border-gray-800/50 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {m.month_label}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {m.patient_count}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {m.bottleneck_stage}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDuration(m.avg_total_time_min)}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[m.system_status] || STATUS_BADGE['No Data']}`}>
                          {m.system_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 italic">
        Based on all historical patient records. Live figures below will update once today's queue starts.
      </p>
    </div>
  );
}