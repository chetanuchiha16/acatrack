// useProtectedPage.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useStudentStore from "../store/useStudentStore";
import type { AuthUser } from "../store/useAuthStore";
import type { StudentData } from "../store/useStudentStore";

interface ProtectedPageResult {
  user: AuthUser | null;
  studentData: StudentData | null;
  loading: boolean;
}

// role param = "Student" | "Parent" | "Staff" | null
export default function useProtectedPage(_role: string | null = null): ProtectedPageResult {
  const navigate = useNavigate();
  const { user, fetchAuthStatus, loading: authLoading } = useAuthStore();
  const {
    studentData,
    fetchStudentData,
    loading: studentLoading,
  } = useStudentStore();

  // Check auth once on mount only if user isn't already loaded
  useEffect(() => {
    if (!user) {
      void fetchAuthStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      void navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Fetch student data only for Parent
  useEffect(() => {
    if (!authLoading && user && !studentData) {
      if (user.who === "Parent") {
        void fetchStudentData();
      }
    }
  }, [authLoading, user, studentData, fetchStudentData]);

  return {
    user,
    studentData,
    loading: authLoading || studentLoading,
  };
}
