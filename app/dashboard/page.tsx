'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOverviewData } from '@/app/dashboard/hooks/useOverviewData';
import { useHistoricalSummary } from '@/app/dashboard/context/HistoricalSummaryContext';
import { calcAvgWaitTime } from '@/utils/waitTime';
import DashboardMetrics from '@/app/dashboard/components/DashboardMetrics';
import HistoricalContextBanner from '@/app/dashboard/components/HistoricalContextBanner';
import LiveQueueTable from '@/app/dashboard/components/LiveQueueTable';
import ServiceStats from '@/app/dashboard/components/ServiceStats';
import HourlyArrivalsChart from '@/app/dashboard/components/HourlyArrivalChart';
import { useIdleTimeout } from './hooks/useIdleTimeout';


export default function DashboardPage() {
  useIdleTimeout();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const { stats, patientsList, deptStats, hourlyData } = useOverviewData();
  const { historicalData, historicalLoading } = useHistoricalSummary();

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.replace('/login');
    };
    checkSession();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [router]);

  const avgWaitTime =
    isMounted && currentTime ? calcAvgWaitTime(patientsList, currentTime) : '--';

  const showHistoricalBanner = isMounted && stats.todayCount === 0;

  return (
    <div className="min-h-screen w-full">
      <div className="px-8 py-6 mx-auto max-w-10xl flex flex-col gap-6">

        <DashboardMetrics
          stats={stats}
          avgWaitTime={avgWaitTime}
          isMounted={isMounted}
        />

        {showHistoricalBanner && (
          <HistoricalContextBanner
            historicalData={historicalData}
            historicalLoading={historicalLoading}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LiveQueueTable
            patients={patientsList}
            currentTime={currentTime ?? new Date()}
            isMounted={isMounted}
          />
          <ServiceStats
            deptStats={deptStats}
            stats={stats}
            isMounted={isMounted}
          />
        </div>

        <HourlyArrivalsChart
          hourlyData={hourlyData}
          isMounted={isMounted}
        />

      </div>
    </div>
  );
}