'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from './components/Sidebar';
import { AssignedSection } from './components/AssignedSection';
import { WithDoctorSection } from './components/WithDoctorSection';
import { FinishedTable } from './components/FinishedTable';
import { useNurseData } from './hooks/useNurseData';
import { useNurseActions } from './hooks/useNurseActions';
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription';
import { useBottleneckNotifications } from '@/app/dashboard/hooks/useBottleneckNotifications';
import NotificationDropdown from '@/app/dashboard/components/NotificationDropdown';
import { CarryoutSection } from './components/CarryoutSection';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useRequireAuth } from './hooks/useRequireAuth';


export default function NursePage() {
  const checking = useRequireAuth();
  useIdleTimeout();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    assignedPatients,
    withDoctorPatients,
    carryoutPatients,
    finishedPatients,
    setAssignedPatients,
    setWithDoctorPatients,
    setCarryoutPatients,
    fetchData,
    fetchFinished,
  } = useNurseData();
  const {
    handleMoveToWithDoctor,
    handleMoveBackFromDoctor,
    handleMoveToCarryout,
    handleMoveBackFromCarryout,
    handleFinish,
  } = useNurseActions(
    setAssignedPatients,
    setWithDoctorPatients,
    setCarryoutPatients,
    fetchFinished
  );

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  } = useBottleneckNotifications();

  const handleRealtimeUpdate = async () => {
    setIsSyncing(true);
    try {
      await fetchData();
      await fetchFinished();
    } finally {
      setIsSyncing(false);
    }
  };

  useRealtimeSubscription(handleRealtimeUpdate);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { 
          router.replace('/login'); 
          return; 
        }
        
        await Promise.all([
          fetchData(),
          fetchFinished()
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const speak = async (text: string, patientId: number, times: number = 3) => {
    setSpeaking(patientId);
    try {
      const response = await fetch(
        'https://api.deepgram.com/v1/speak?model=aura-2-amalthea-en',
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.NEXT_PUBLIC_DEEPGRAM_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        }
      );
      if (!response.ok) { setSpeaking(null); return; }
      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      let count = 0;
      const audio = new Audio(audioUrl);
      const playOnce = async () => { audio.currentTime = 0; await audio.play(); count++; };
      audio.onended = () => {
        if (count < times) setTimeout(playOnce, 800);
        else { URL.revokeObjectURL(audioUrl); setSpeaking(null); }
      };
      await playOnce();
    } catch { setSpeaking(null); }
  };

  const handleCall = (patient: any) => {
    const num = patient.patientNum;
    const letter = num.charAt(0);
    const digits = parseInt(num.slice(1), 10).toString();
    speak(`Number ${letter} ${digits}, Number ${letter} ${digits}, please proceed to the doctor`, patient.id);
  };

  const visibleAssigned = assignedPatients.filter(p => {
    if (!selectedCategory) return true;
    return p.service === selectedCategory;
  });

  const visibleWithDoctor = withDoctorPatients.filter(p => {
    if (!selectedCategory) return true;
    return p.service === selectedCategory;
  });

  const visibleCarryout = carryoutPatients.filter((patient) => {
    if (!selectedCategory) return true;
    return patient.service === selectedCategory;
  });

  const getCounts = () => {
    const counts: Record<string, number> = {};
    const categories = ['Consultation', 'OPD Card', 'Refill Prescription', 'ECG', 'Warfarin', 'OPD Reschedule', 'Benzathine', 'OPD Screening'];
    categories.forEach(cat => {
      counts[cat] =
      assignedPatients.filter((p) => p.service === cat).length +
      withDoctorPatients.filter((p) => p.service === cat).length +
      carryoutPatients.filter((p) => p.service === cat).length;
    });
    return counts;
  };

    if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-white via-red-50 to-red-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading nurse dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-linear-to-br from-white via-red-50 to-red-100 font-sans relative">
      <Sidebar
        sidebarOpen={sidebarOpen}
        selectedCategory={selectedCategory}
        categoryCounts={getCounts()}
        onSelectCategory={setSelectedCategory}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm border-b border-blue-100 shadow-sm">
          <div className="flex items-center gap-2">
            <i className="bx bx-user-plus text-gray-400 text-lg"></i>
            <span className="text-gray-500 text-sm">Patient Management</span>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-600 font-medium">Syncing...</span>
              </div>
            )}
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDismiss={dismissNotification}
              onClearAll={clearAll}
            />
          </div>
        </div>

        <div className="px-8 py-6 h-[calc(100vh-73px)] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-xl font-semibold text-gray-700">Patient Queue</h1>
            {selectedCategory && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Filtered by: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="ml-2 text-gray-400 hover:text-[#cc3535]"
                >
                  <i className="bx bx-x"></i>
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <AssignedSection
              patients={visibleAssigned}
              speakingId={speaking}
              onCall={handleCall}
              onMoveToWithDoctor={handleMoveToWithDoctor}
            />
              <WithDoctorSection
                patients={visibleWithDoctor}
                onMoveBack={handleMoveBackFromDoctor}
                onMoveToCarryout={handleMoveToCarryout}
              />

              <CarryoutSection
                patients={visibleCarryout}
                onMoveBack={handleMoveBackFromCarryout}
                onFinish={handleFinish}
              />

              <FinishedTable patients={finishedPatients} />
          </div>
        </div>
      </div>
    </div>
  );
}