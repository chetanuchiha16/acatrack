import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listBatchesBatchesGet } from "../client/sdk.gen";

interface StaffAssignment {
    teacher_username?: string;
    subject_code?: string;
    subject_name?: string;
    section_id?: number;
    semester?: string;
    batch_year?: number;
}

interface StaffState {
    batchYear: string;
    availableBatches: string[];
    semester: string;
    section: string;
    assignments: StaffAssignment[];
    loadingBatches: boolean;
    setBatchYear: (year: string) => void;
    setSemester: (sem: string) => void;
    setSection: (sec: string) => void;
    setAssignments: (assignments: StaffAssignment[]) => void;
    fetchBatches: () => Promise<void>;
}

const useStaffStore = create<StaffState>()(
    persist(
        (set, get) => ({
            batchYear: "",
            availableBatches: [],
            semester: "sem1",
            section: "ALL",
            assignments: [],
            loadingBatches: false,

            setBatchYear: (year: string) => set({ batchYear: year }),
            setSemester: (sem: string) => set({ semester: sem }),
            setSection: (sec: string) => set({ section: sec }),
            setAssignments: (assignments: StaffAssignment[]) => set({ assignments }),

            fetchBatches: async () => {
                if (get().availableBatches.length > 0 && get().batchYear) return;

                set({ loadingBatches: true });
                try {
                    const res = await listBatchesBatchesGet();
                    const rawData = res.data as { batches?: number[] } | undefined;
                    const fetchedBatches = rawData?.batches?.map(String) || [];
                    set({ 
                        availableBatches: fetchedBatches, 
                        loadingBatches: false 
                    });
                    
                    // Set default batch year if none selected
                    if (fetchedBatches.length > 0 && !get().batchYear) {
                        set({ batchYear: fetchedBatches[fetchedBatches.length - 1] });
                    }
                } catch (err) {
                    console.error("Failed to fetch batches", err);
                    set({ loadingBatches: false });
                }
            },
        }),
        {
            name: "staff-storage",
            partialize: (state) => ({ 
                batchYear: state.batchYear,
                semester: state.semester,
                section: state.section
            }),
        }
    )
);

export default useStaffStore;

