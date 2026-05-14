import React from "react";
import useProtectedPage from "../hooks/useProtectedPage";
import MenteeRecieveEmails from "../pages/student/MenteeRecieveEmails";
import MenteeRecordFilling from "../pages/student/MenteeRecordFilling";
import LoadingSpinner from "../components/LoadingSpinner";

export const MenteeEmailsWrapper: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    if (loading) return <LoadingSpinner message="Loading..." fullScreen={false} />;
    if (!user) return null;
    return <MenteeRecieveEmails usn={user.id || ""} />;
};

export const MenteeRecordWrapper: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    if (loading) return <LoadingSpinner message="Loading..." fullScreen={false} />;
    if (!user) return null;
    return <MenteeRecordFilling usn={user.id || ""} name={user.name || ""} />;
};
