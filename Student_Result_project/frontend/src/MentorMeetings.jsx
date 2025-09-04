import React, { useState, useEffect } from "react";
import axios from "axios";
import { CalendarDays } from "lucide-react";
import API_BASE from "./config";
export default function MentorMeetings({ mentorId }) {
  const [meetings, setMeetings] = useState([]);
  const [date, setDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");

  

  // Fetch meetings from backend
  const fetchMeetings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/Staff/Mentor/meeting/${mentorId}`);
      setMeetings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [mentorId]);

  // Add a new meeting
  const addMeeting = async () => {
    if (!title || !date) {
      alert("Please enter a title and date");
      return;
    }

    try {
      await axios.post(`${API_BASE}/auth/Staff/Mentor/meeting/${mentorId}`, { title, date, venue, agenda });

      setTitle("");
      setDate("");
      setVenue("");
      setAgenda("");
      fetchMeetings(); // refresh list
    } catch (err) {
      console.error(err);
      alert("Error adding meeting");
    }
  };

  // Delete a meeting
  const removeMeeting = async (id) => {
    try {
      await axios.delete(`${API_BASE}/auth/Staff/Mentor/meeting/delete/${id}`);

      fetchMeetings();
    } catch (err) {
      console.error(err);
      alert("Error deleting meeting");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold mb-4">Set Meeting Reminder</h2>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded w-full md:w-1/2"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border p-2 rounded w-full md:w-1/2"
      />
      <input
        type="text"
        placeholder="Venue"
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        className="border p-2 rounded w-full md:w-1/2"
      />
      <textarea
        placeholder="Agenda / Notes..."
        value={agenda}
        onChange={(e) => setAgenda(e.target.value)}
        className="border p-2 rounded w-full md:w-1/2"
        rows={3}
      />

      <button
  onClick={addMeeting}
  disabled={!title || !date || !venue}
  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
    title && date && venue ? "bg-blue-600 text-white hover:bg-blue-700" : "!bg-gray-300 !text-gray-600 !cursor-not-allowed hover:!border-white"
  }`}
>
  <CalendarDays className="w-4 h-4" /> Save Reminder
</button>

      <h3 className="mt-6 font-bold text-xl">Upcoming Meetings</h3>
      {meetings.length === 0 ? (
        <p>No meetings scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {meetings
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((m) => (
              <li
                key={m.id}
                className="border p-2 rounded flex justify-between items-center"
              >
                <div>
  <strong>{m.title}</strong> - {new Date(m.date).toLocaleDateString()}
  <br />
  <strong>{m.venue}</strong>
  <p className="text-sm">{m.agenda}</p>
</div>

                <button
                  onClick={() => removeMeeting(m.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
