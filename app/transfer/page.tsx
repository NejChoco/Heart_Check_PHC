'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from './components/Sidebar';
import { BreadcrumbNav } from './components/BreadcrumbNav';
import { ConsultationFlow } from './components/ConsultationFlow';
import { OPScreeningFlow } from './components/OPScreeningFlow';
import { OtherServicesFlow } from './components/OtherServicesFlow';
import { usePatientData } from './hooks/usePatientData';
import { useCubicleData } from './hooks/useCubicleData';
import { useAutoAssign } from './hooks/useAutoAssign';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useRealtimeSubscription } from './hooks/useRealtimeSubscription';
import { sendSMS } from "@/app/actions/sendSMS";
import { RegistrationCounterSection } from './components/RegistrationCounterSection';
import { useRegistrationDragAndDrop } from './hooks/useRegistrationDragAndDrop';
import { Patient } from '@/types/Types';
import { useAutoRotate } from './hooks/useAutoRotate';
import { useRotateTimeout } from './hooks/useRotateTimeout';
import { DoctorsModal } from './components/DoctorsModal';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useRequireAuth } from './hooks/useRequireAuth'; 
import { MAX_PATIENTS_PER_CUBICLE } from './lib/constants';

export default function TransferPage() {
  const checking = useRequireAuth();
  useIdleTimeout();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [registrationPatients, setRegistrationPatients] = useState<Patient[]>([]);
  const pendingUpdatesRef = useRef<Patient[]>([]);
  const dragInProgressRef = useRef(false);
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const { regDraggedPatient, dragOverCounter, handleRegDragStart } = useRegistrationDragAndDrop(
    registrationPatients, setRegistrationPatients
  );
  const { onProgressPatients, assignedPatients, setOnProgressPatients, setAssignedPatients, fetchData } = usePatientData();
  const { cubicles, fetchCubicles, cubicleDoctorMap } = useCubicleData();
  const {
    draggedPatient,
    dragOverCubicle,
    handleDragStartFromQueue,
    handleDragStartFromCubicle,
    handleMoveBackToProgress,
    setupGlobalDragHandlers,
    pendingUpdates,
    setPendingUpdates,
  } = useDragAndDrop(
    assignedPatients,
    setOnProgressPatients,
    setAssignedPatients,
    fetchData
  );
  useEffect(() => {
    dragInProgressRef.current = Boolean(draggedPatient);
  }, [draggedPatient]);

  const rotateTimeoutMs = useRotateTimeout();
  const savingPendingUpdates = useRef(false);

  const fetchRegistrationPatients = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .in('service', ['Consultation', 'OPD Screening'])
      .not('counter', 'is', null)
      .is('reg_end', null)
      .neq('status', 'Assigned')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('counter', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (!error && data) setRegistrationPatients(data);
  }, []);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const syncing = useRef(false);

    const handleRealtimeUpdate = () => {
      if (dragInProgressRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        if (dragInProgressRef.current || syncing.current) return;

        syncing.current = true;
        setIsSyncing(true);

        try {
          await Promise.all([
            fetchData(),
            fetchRegistrationPatients(),
          ]);
          reapplyPendingUpdates(pendingUpdatesRef.current);
        } finally {
          setIsSyncing(false);
          syncing.current = false;
        }
      }, 400);
    };
    const reapplyPendingUpdates = useCallback((pending: Patient[]) => {
  if (pending.length === 0) return;
  const pendingIds = pending.map(p => p.id);

  setOnProgressPatients(prev => {
    const withoutPending = prev.filter(p => !pendingIds.includes(p.id));
    const onProgressPending = pending.filter(p => p.status === 'On Progress');
    return [...withoutPending, ...onProgressPending];
  });

  setAssignedPatients(prev => {
    const cleaned: Record<string, Patient[]> = {};
    for (const [cubicle, patients] of Object.entries(prev)) {
      cleaned[cubicle] = patients.filter(p => !pendingIds.includes(p.id));
    }
    const assignedPending = pending.filter(p => p.status === 'Assigned' && p.cubicleNum);
    for (const p of assignedPending) {
      cleaned[p.cubicleNum!] = [...(cleaned[p.cubicleNum!] || []), p];
    }
    return cleaned;
  });
}, [setOnProgressPatients, setAssignedPatients]);

  const autoOpsBusy = useRef(false);

  useAutoAssign(
    selectedCategory,
    onProgressPatients,
    assignedPatients,
    cubicles,
    setPendingUpdates,
    setOnProgressPatients,
    setAssignedPatients,
    autoOpsBusy
  );
  useAutoRotate(onProgressPatients, assignedPatients, fetchData, autoOpsBusy, rotateTimeoutMs);
  useRealtimeSubscription(handleRealtimeUpdate);

  useEffect(() => {
  pendingUpdatesRef.current = pendingUpdates;
  }, [pendingUpdates]);

  const isConsultation = selectedCategory === 'Consultation';
  const isOPScreening = selectedCategory === 'OPD Screening';
  const isDragEnabled = isConsultation || isOPScreening;

  useEffect(() => {
    const cleanup = setupGlobalDragHandlers(isDragEnabled);
    return cleanup;
  }, [draggedPatient, dragOverCubicle, assignedPatients, isDragEnabled]);

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

    const handleAssignNow = (patient: Patient) => {
    if (!patient.service) return;

    const serviceCubicles = cubicles.filter(c => c.category === patient.service);

    let bestCubicle: typeof serviceCubicles[number] | null = null;
    let bestCount = Infinity;

    for (const cubicle of serviceCubicles) {
      const count = assignedPatients[cubicle.cubicleNum]?.length || 0;
      if (count < MAX_PATIENTS_PER_CUBICLE && count < bestCount) {
        bestCubicle = cubicle;
        bestCount = count;
      }
    }

    if (!bestCubicle) {
      console.warn('No available cubicle to assign this patient right now.');
      return;
    }

    const now = new Date().toISOString();

    setOnProgressPatients(prev => prev.filter(p => p.id !== patient.id));

    setAssignedPatients(prev => ({
      ...prev,
      [bestCubicle!.cubicleNum]: [
        ...(prev[bestCubicle!.cubicleNum] || []),
        { ...patient, cubicleNum: bestCubicle!.cubicleNum, status: 'Assigned', called_at: now },
      ],
    }));

    setPendingUpdates(prev => [
      ...prev.filter(p => p.id !== patient.id),
      { ...patient, cubicleNum: bestCubicle!.cubicleNum, status: 'Assigned', called_at: now },
    ]);
  };

  const handleReleaseFromCounter = async (patient: Patient) => {
        const now = new Date().toISOString();

        setRegistrationPatients(prev => prev.filter(p => p.id !== patient.id));

        const { error } = await supabase
          .from('patients')
          .update({ reg_end: now })
          .eq('id', patient.id);

        if (error) {
          console.error('Failed to release patient from counter:', error);

          fetchRegistrationPatients();
          return;
        }

        setOnProgressPatients(prev =>
          prev.map(p => (p.id === patient.id ? { ...p, reg_end: now } : p))
        );
      };

      const handleConfirm = async () => {
        if (pendingUpdates.length === 0 || savingPendingUpdates.current) return;

        savingPendingUpdates.current = true;
        setIsSyncing(true);

      try {
        const now = new Date().toISOString();

        const patientUpdates = pendingUpdates.map((patient) => ({
          id: patient.id,
          cubicleNum: patient.cubicleNum,
          status: patient.status,
          reg_end: patient.reg_end,
          called_at:
            patient.called_at ??
            (patient.status === "Assigned" ? now : null),
          queue_position: 9999,
          cooldown_until: patient.cooldown_until ?? null,
        }));

        await supabase.from("patients").upsert(patientUpdates, { onConflict: "id" });

        await Promise.all(
          pendingUpdates
            .filter(p => p.phoneNum && p.status === "Assigned" && p.cubicleNum)
            .map(p => sendSMS(String(p.phoneNum), p.patientNum, p.cubicleNum!))
        );

        const { data: queue } = await supabase
          .from("patients")
          .select("id")
          .neq("status", "Assigned")
          .order("queue_position");

        if (queue && queue.length > 0) {
          const reorder = queue.map((row, i) => ({ id: row.id, queue_position: i + 1 }));
          await supabase.from("patients").upsert(reorder, { onConflict: "id" });
        }

        setPendingUpdates([]);
        pendingUpdatesRef.current = [];

        await Promise.all([
          fetchData(),
          fetchRegistrationPatients(),
        ]);

      } catch (err) {
        console.error(err);
      } finally {
        savingPendingUpdates.current = false;
        setIsSyncing(false);
      }
    };

    useEffect(() => {
      if (
        pendingUpdates.length === 0 ||
        draggedPatient ||
        isSyncing ||
        savingPendingUpdates.current
      ) {
        return;
      }

      const timer = window.setTimeout(() => {
        void handleConfirm();
      }, 1800);

      return () => window.clearTimeout(timer);
    }, [pendingUpdates, draggedPatient, isSyncing, handleConfirm]);

  const getAvailableRooms = () => {
    if (!selectedCategory) return [];
    if (isConsultation && selectedSubcategory) {
      const filteredCubicles = cubicles.filter(c =>
        c.category === selectedCategory && c.subcategory === selectedSubcategory
      );
      return [...new Set(filteredCubicles.map(c => c.room))].sort();
    } else if (isOPScreening) {
      const filteredCubicles = cubicles.filter(c => c.category === selectedCategory);
      return [...new Set(filteredCubicles.map(c => c.room))].sort();
    } else if (!isConsultation && !isOPScreening && selectedCategory) {
      const filteredCubicles = cubicles.filter(c => c.category === selectedCategory);
      return [...new Set(filteredCubicles.map(c => c.room))].sort();
    }
    return [];
  };

  const getVisibleCubicles = () => {
    if (isConsultation && selectedSubcategory && selectedRoom) {
      return cubicles.filter(c =>
        c.category === selectedCategory &&
        c.subcategory === selectedSubcategory &&
        c.room === selectedRoom
      );
    } else if (isOPScreening && selectedRoom) {
      return cubicles.filter(c =>
        c.category === selectedCategory && c.room === selectedRoom
      );
    } else if (!isConsultation && !isOPScreening && selectedCategory) {
      return cubicles.filter(c => c.category === selectedCategory);
    }
    return [];
  };

    const visibleCubicles = getVisibleCubicles();
    const rooms = getAvailableRooms();

    const visibleOnProgress = onProgressPatients.filter(p => {
      if (!selectedCategory) return true;
      if (isConsultation) return p.service === 'Consultation';
      if (isOPScreening) return p.service === 'OPD Screening';
      return p.service === selectedCategory;
    });

    
  const queueCounts = {
    'Consultation': onProgressPatients.filter(p => p.service === 'Consultation').length,
    'OPD Screening': onProgressPatients.filter(p => p.service === 'OPD Screening').length,
    'OPD Card': onProgressPatients.filter(p => p.service === 'OPD Card').length,
    'Refill Prescription': onProgressPatients.filter(p => p.service === 'Refill Prescription').length,
    'ECG': onProgressPatients.filter(p => p.service === 'ECG').length,
    'Warfarin': onProgressPatients.filter(p => p.service === 'Warfarin').length,
    'OPD Reschedule': onProgressPatients.filter(p => p.service === 'OPD Reschedule').length,
    'Benzathine': onProgressPatients.filter(p => p.service === 'Benzathine').length,
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.all([
          fetchData(),
          fetchCubicles(),
          fetchRegistrationPatients(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

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
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!selectedCategory) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <i className="bx bx-folder-open text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-400 text-lg">Select a service from the sidebar</p>
          </div>
        </div>
      );
    }

    if (isConsultation) {
      return (
        <ConsultationFlow
          selectedSubcategory={selectedSubcategory}
          selectedRoom={selectedRoom}
          rooms={rooms}
          visibleCubicles={visibleCubicles}
          visibleOnProgress={visibleOnProgress}
          assignedPatients={assignedPatients}
          draggedPatient={draggedPatient}
          dragOverCubicle={dragOverCubicle}
          speaking={speaking}
          onSelectSubcategory={setSelectedSubcategory}
          onSelectRoom={setSelectedRoom}
          onDragStartFromQueue={handleDragStartFromQueue}
          onDragStartFromCubicle={handleDragStartFromCubicle}
          onSpeak={speak}
          onMoveBackToProgress={handleMoveBackToProgress}
          isDragEnabled={isDragEnabled}
          registrationPatients={registrationPatients}
          regDraggedPatient={regDraggedPatient}
          dragOverCounter={dragOverCounter}
          onRegDragStart={handleRegDragStart}
          cubicleDoctorMap={cubicleDoctorMap}
          onReleaseFromCounter={handleReleaseFromCounter}
          onAssignNow={handleAssignNow}
        />
      );
    }

    if (isOPScreening) {
      return (
        <OPScreeningFlow
          selectedRoom={selectedRoom}
          rooms={rooms}
          visibleCubicles={visibleCubicles}
          visibleOnProgress={visibleOnProgress}
          assignedPatients={assignedPatients}
          draggedPatient={draggedPatient}
          dragOverCubicle={dragOverCubicle}
          speaking={speaking}
          onSelectRoom={setSelectedRoom}
          onDragStartFromQueue={handleDragStartFromQueue}
          onDragStartFromCubicle={handleDragStartFromCubicle}
          onSpeak={speak}
          onMoveBackToProgress={handleMoveBackToProgress}
          isDragEnabled={isDragEnabled}
          registrationPatients={registrationPatients}
          regDraggedPatient={regDraggedPatient}
          dragOverCounter={dragOverCounter}
          onRegDragStart={handleRegDragStart}
          onReleaseFromCounter={handleReleaseFromCounter}
          onAssignNow={handleAssignNow}
        />
      );
    }

    return (
      <OtherServicesFlow
      visibleCubicles={visibleCubicles}
      visibleOnProgress={visibleOnProgress}
      assignedPatients={assignedPatients}
      draggedPatient={draggedPatient}
      dragOverCubicle={dragOverCubicle}
      speaking={speaking}
      selectedCategory={selectedCategory}
      onDragStartFromQueue={handleDragStartFromQueue}
      onDragStartFromCubicle={handleDragStartFromCubicle}
      onSpeak={speak}
      onMoveBackToProgress={handleMoveBackToProgress}
      isDragEnabled={isDragEnabled}
      rotateTimeoutMs={rotateTimeoutMs}
    />
    );
  };

  return (
    <div className="flex min-h-screen bg-linear-to-br from-white via-red-50 to-red-100 font-sans">
      <Sidebar
        sidebarOpen={sidebarOpen}
        selectedCategory={selectedCategory}
        queueCounts={queueCounts}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedSubcategory(null);
          setSelectedRoom(null);
        }}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm border-b border-red-100 shadow-sm">
          <div className="flex items-center gap-2">
            <i className="bx bx-transfer text-gray-400 text-lg"></i>
            <span className="text-gray-500 text-sm">Patient Transfer</span>
          </div>
          <div className="flex items-center gap-2">

            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-blue-600">Syncing...</span>
              </div>
            )}

            <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-50 transition">
              <i className="bx bxs-bell text-lg text-gray-500"></i>
            </button>

            <button
            onClick={() => setShowDoctorsModal(true)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-50 transition"
            title="Manage Doctors"
          >
            <i className="bx bx-plus-medical text-lg text-gray-500"></i>
          </button>

            </div>
        </div>

        <div className="px-8 py-6 h-[calc(100vh-73px)] overflow-y-auto">
          <BreadcrumbNav
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            selectedRoom={selectedRoom}
            isConsultation={isConsultation}
            onReset={() => {
              setSelectedCategory(null);
              setSelectedSubcategory(null);
              setSelectedRoom(null);
            }}
            onResetToCategory={() => {
              setSelectedSubcategory(null);
              setSelectedRoom(null);
            }}
            onResetToSubcategory={() => setSelectedRoom(null)}
          />

          {renderContent()}
        </div>
      </div>
      {showDoctorsModal && <DoctorsModal onClose={() => setShowDoctorsModal(false)} />}
    </div>
  );
}