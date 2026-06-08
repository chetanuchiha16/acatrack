import { create } from "zustand";
import { persist } from "zustand/middleware";
import { 
    listBatchesBatchesGet,
    getStaffAvailableSemestersAuthStaffAvailableSemestersGet
} from "../client/sdk.gen";

export interface StaffAssignment {
    teacher_username?: string;
    subject_code?: string;
    subject_name?: string;
    section_id?: number;
    section_name?: string;
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
    availableSems: string[];
    setBatchYear: (year: string) => void;
    setSemester: (sem: string) => void;
    setSection: (sec: string) => void;
    setAssignments: (assignments: StaffAssignment[]) => void;
    fetchBatches: () => Promise<void>;
    fetchAvailableSemesters: (batchYear?: string) => Promise<void>;
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
            availableSems: ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7", "sem8"],

            setBatchYear: (year: string) => {
                set({ batchYear: year });
                void get().fetchAvailableSemesters(year);
            },
            setSemester: (sem: string) => set({ semester: sem }),
            setSection: (sec: string) => set({ section: sec }),
            setAssignments: (assignments: StaffAssignment[]) => set({ assignments }),

            fetchAvailableSemesters: async (by?: string) => {
                const year = by || get().batchYear;
                if (!year) return;
                try {
                    const res = await getStaffAvailableSemestersAuthStaffAvailableSemestersGet({
                        query: { batch_year: Number(year) }
                    });
                    const sems = res.data?.available_semesters || [];
                    if (sems.length > 0) {
                        set({ 
                            availableSems: sems,
                            semester: sems[sems.length - 1]
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch available semesters", err);
                }
            },

            fetchBatches: async () => {
                if (get().availableBatches.length > 0 && get().batchYear) {
                    void get().fetchAvailableSemesters();
                    return;
                }

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
                        const defaultYear = fetchedBatches[fetchedBatches.length - 1];
                        set({ batchYear: defaultYear });
                        void get().fetchAvailableSemesters(defaultYear);
                    } else if (get().batchYear) {
                        void get().fetchAvailableSemesters();
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
