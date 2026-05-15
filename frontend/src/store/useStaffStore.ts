import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listBatchesBatchesGet } from "../client/sdk.gen";

interface StaffState {
    batchYear: string;
    availableBatches: string[];
    semester: string;
    section: string;
    assignments: any[];
    loadingBatches: boolean;
    setBatchYear: (year: string) => void;
    setSemester: (sem: string) => void;
    setSection: (sec: string) => void;
    setAssignments: (assignments: any[]) => void;
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
            setAssignments: (assignments: any[]) => set({ assignments }),

            fetchBatches: async () => {
                if (get().availableBatches.length > 0 && get().batchYear) return;

                set({ loadingBatches: true });
                try {
                    const res = await listBatchesBatchesGet();
                    const fetchedBatches = (res.data as any)?.batches?.map(String) || [];
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
