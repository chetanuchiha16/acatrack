import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "./useAuthStore";
import useStudentStore from "./useStudentStore";

// role param = "Student" | "Parent" | "Staff" | null
export default function useProtectedPage(role = null) {
  const navigate = useNavigate();
  const { user, fetchAuthStatus, loading: authLoading } = useAuthStore();
  const {
    studentData,
    fetchStudentData,
    loading: studentLoading,
  } = useStudentStore();

  // Always check auth on mount
  useEffect(() => {
    if (!user) fetchAuthStatus();
  }, [user, fetchAuthStatus]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Fetch student data only for Parent/Student
  useEffect(() => {
    if (!authLoading && user && !studentData) {
      if (user.who === "Parent") {
        fetchStudentData();
      }
    }
  }, [authLoading, user, studentData, fetchStudentData]);

  return {
    user,
    studentData,
    loading: authLoading || studentLoading,
  };
}
