'use client';
import { useState, useRef } from 'react';
import { sendSMS } from '@/app/actions/sendSMS';
import { supabase } from '@/lib/supabase';
import { Patient } from '@/types/Types';
import { MAX_PATIENTS_PER_CUBICLE } from '../lib/constants';

const MANUAL_SERVICES = ['Consultation', 'OPD Screening'];

export function useDragAndDrop(
  assignedPatients: Record<string, Patient[]>,
  setOnProgressPatients: React.Dispatch<React.SetStateAction<Patient[]>>,
  setAssignedPatients: React.Dispatch<React.SetStateAction<Record<string, Patient[]>>>,
  fetchData: () => Promise<void>
) {
  const [draggedPatient, setDraggedPatient] = useState<Patient | null>(null);
  const [dragSourceCubicle, setDragSourceCubicle] = useState<string | null>(null);
  const [dragOverCubicle, setDragOverCubicle] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Patient[]>([]);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const resetDrag = () => {
    setDraggedPatient(null);
    setDragSourceCubicle(null);
    setDragOverCubicle(null);
    dragStartPos.current = null;
  };

  const handleDragStartFromQueue = (e: React.MouseEvent, patient: Patient) => {
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDraggedPatient(patient);
    setDragSourceCubicle(null);
  };

  const handleDragStartFromCubicle = (e: React.MouseEvent, patient: Patient, cubicleNum: string) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDraggedPatient(patient);
    setDragSourceCubicle(cubicleNum);
  };

  const handleMoveBackToProgress = async (
    patient: Patient,
    oldCubicleNum: string
  ) => {
    const isManual = !!patient.service && MANUAL_SERVICES.includes(patient.service);

    if (isManual) {
      const cooldownUntil = new Date(Date.now() + 60 * 1000).toISOString(); 
      
      setAssignedPatients(prev => ({
        ...prev,
        [oldCubicleNum]: (prev[oldCubicleNum] || []).filter(
          p => p.id !== patient.id
        )
      }));

      setOnProgressPatients(prev => [
        ...prev,
        {
          ...patient,
          cubicleNum: null,
          status: "On Progress",
          cooldown_until: cooldownUntil,
        }
      ]);

      setPendingUpdates(prev => [
        ...prev.filter(p => p.id !== patient.id),
        {
          ...patient,
          cubicleNum: null,
          status: "On Progress",
          cooldown_until: cooldownUntil,
        }
      ]);
      return;
    }

    const { data: minRow } = await supabase
      .from('patients')
      .select('queue_position')
      .order('queue_position', { ascending: true })
      .limit(1)
      .single();

    const frontPosition = (minRow?.queue_position ?? 1) - 1;

    await supabase
      .from('patients')
      .update({
        cubicleNum: null,
        status: 'Waiting',
        called_at: null,
        progress_started_at: null,
        cubicle_top_started_at: null,
        queue_position: frontPosition,
      })
      .eq('id', patient.id);

    await fetchData();
  };

  const setupGlobalDragHandlers = (isDragEnabled: boolean) => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggedPatient || !dragStartPos.current) return;
      
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let targetCubicle = null;
      
      for (let el of elements) {
        const cubicleAttr = (el as HTMLElement).getAttribute('data-cubicle');
        if (cubicleAttr) {
          targetCubicle = cubicleAttr;
          break;
        }
      }
      
      setDragOverCubicle(targetCubicle);
    };

    const handleGlobalMouseUp = async (e: MouseEvent) => {
      if (!draggedPatient) {
        resetDrag();
        return;
      }
      
      if (dragOverCubicle) {
        const targetCount = assignedPatients[dragOverCubicle]?.length || 0;
        if (targetCount >= MAX_PATIENTS_PER_CUBICLE) {
          resetDrag();
          return;
        }

        const now = new Date().toISOString();

        if (dragSourceCubicle) {
          setAssignedPatients(prev => ({
            ...prev,
            [dragSourceCubicle]: (prev[dragSourceCubicle] || []).filter(
              p => p.id !== draggedPatient.id
            ),
            [dragOverCubicle]: [
              ...(prev[dragOverCubicle] || []),
              {
                ...draggedPatient,
                cubicleNum: dragOverCubicle,
                status: "Assigned"
              }
            ]
          }));

          setPendingUpdates(prev => [
            ...prev.filter(p => p.id !== draggedPatient.id),
            {
              ...draggedPatient,
              cubicleNum: dragOverCubicle,
              status: "Assigned"
            }
          ]);
        } else {
          setOnProgressPatients(prev => prev.filter(p => p.id !== draggedPatient.id));
          setAssignedPatients(prev => ({
            ...prev,
            [dragOverCubicle]: [...(prev[dragOverCubicle] || []), { 
              ...draggedPatient, 
              cubicleNum: dragOverCubicle, 
              status: 'Assigned',
              reg_end: now
            }]
          }));
          
            setPendingUpdates(prev => [
                ...prev.filter(p => p.id !== draggedPatient.id),
                {
                    ...draggedPatient,
                    cubicleNum: dragOverCubicle,
                    status: "Assigned",
                    reg_end: now
                }
            ]);
          
        }
      }
      
      resetDrag();
    };

    if (draggedPatient && isDragEnabled) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  };

  return {
  draggedPatient,
  dragOverCubicle,
  handleDragStartFromQueue,
  handleDragStartFromCubicle,
  handleMoveBackToProgress,
  setupGlobalDragHandlers,
  resetDrag,
  pendingUpdates,
  setPendingUpdates,
  };
}