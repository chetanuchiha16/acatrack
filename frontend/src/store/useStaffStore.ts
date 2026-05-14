import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listBatchesBatchesGet } from "../client/sdk.gen";

interface StaffState {
    batchYear: string;
    availableBatches: string[];
    loadingBatches: boolean;
    setBatchYear: (year: string) => void;
    fetchBatches: () => Promise<void>;
}

const useStaffStore = create<StaffState>()(
    persist(
        (set, get) => ({
            batchYear: "",
            availableBatches: [],
            loadingBatches: false,

            setBatchYear: (year: string) => set({ batchYear: year }),

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
            partialize: (state) => ({ batchYear: state.batchYear }),
        }
    )
);

export default useStaffStore;
