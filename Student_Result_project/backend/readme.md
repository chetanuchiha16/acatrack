## 🚀 API Documentation

The backend follows a modular structure where endpoints are organized by role and functionality.

### 1. Authentication & Account Management (`auth.py`, `forgot_password.py`)

| Endpoint | Method | Description | Input |
| --- | --- | --- | --- |
| `/auth` | `POST` | Authenticates users (Student/Staff/Parent) and returns JWT. | JSON: `who`, `username`, `password`, `batch_year` |
| `/auth/status` | `GET` | Validates current session and role. | Header: `Authorization` |
| `/auth/forgot/request` | `POST` | Generates and emails a password reset link. | JSON: `username` |
| `/auth/forgot/reset/<token>` | `POST` | Resets password using a valid, unexpired token. | JSON: `password` |
| `/logout` | `POST` | Ends the current user session. | None |

### 2. Student & Parent Services (`send_studends_data.py`, `parent.py`)

| Endpoint | Method | Description | Input |
| --- | --- | --- | --- |
| `/auth/Student/result` | `GET` | Fetches student marks and an inline Base64 PDF report. | Query: `usn`, `semester` |
| `/auth/Student/chart` | `GET` | Returns a Base64 subject performance graph. | Query: `usn`, `semester` |
| `/auth/Student/report/<file>` | `GET` | Downloads a specific student report PDF. | Path Param: `filename` |
| `/parent/student-details` | `GET` | Returns details for the linked student and mentor. | JWT Token |

### 3. Mentorship & Meetings (`mentor_meetings.py`, `mentee_meetings.py`, `mentee_record.py`)

| Endpoint | Method | Description | Input |
| --- | --- | --- | --- |
| `/auth/Staff/Mentor/meeting/<id>` | `GET` | Fetches all scheduled meetings for a mentor. | Path Param: `mentor_id` |
| `/auth/Staff/Mentor/meeting/<id>` | `POST` | Adds a new meeting and emails all mentees. | JSON: `title`, `venue`, `agenda`, `date` |
| `/auth/Student/Mentee/meeting/<usn>` | `GET` | Fetches meetings scheduled for a specific student. | Path Param: `student_usn` |
| `/mentee/upload_form` | `POST` | Fills a student record PDF and saves to Supabase. | JSON: Personal/Academic data |
| `/mentee/mentor/<id>/pdfs` | `GET` | Lists all mentee record PDF URLs for a mentor. | Path Param: `mentor_id` |

### 4. Communication (`send_email.py`, `mentor_send_email.py`, `mentee_recieve_email.py`)

| Endpoint | Method | Description | Input |
| --- | --- | --- | --- |
| `/send-email/all` | `POST` | Broadcasts emails to all students/parents in a batch. | JSON: `recipientType`, `subject`, `message` |
| `/mentor/<id>/send-email/all` | `POST` | Mentor sends email broadcast to all their mentees. | JSON: `recipientType`, `subject`, `message` |
| `/student/<usn>/messages` | `GET` | Retrieves a list of messages sent to a student. | Path Param: `usn` |
| `/student/<usn>/messages/<id>/read` | `POST` | Marks a specific message as read. | Path Param: `usn`, `msg_id` |

### 5. AI & Performance Analysis (`student_analysis.py`, `student_ai.py`, `chatbot.py`)

| Endpoint | Method | Description | Input |
| --- | --- | --- | --- |
| `/auth/Student/analysis` | `GET` | Provides granular subject advice & SGPA prediction. | Query: `usn`, `semester` |
| `/ai/summary` | `GET` | Returns multi-semester academic overview. | Query: `usn` |
| `/ai/trend` | `GET` | Calculates SGPA trend (Improving/Declining). | Query: `usn` |
| `/ai/predict_cgpa` | `GET` | Predicts future CGPA using Ridge regression. | Query: `usn` |
| `/ai/profile` | `GET` | Generates placement advice and skill learning plans. | Query: `usn` |
| `/report/<query>` | `GET` | Fuzzy searches students for the AI Chatbot. | Path Param: `student_query` |

### 6. Staff & Admin Controls (`send_sem_res_data.py`, `send_uni_data.py`, `pdftoexcel_route.py`)

| Endpoint | Method | Description | Input |
| --- | --- | --- | --- |
| `/auth/Staff/sem_res` | `GET` | Fetches results for every subject in a semester. | Query: `semester` |
| `/auth/Staff/overall_res` | `GET` | Retrieves batch performance, toppers, or failures. | Query: `semester`, `show_toppers` |
| `/pdf/upload_archive` | `POST` | Background job to extract USNs from zip/rar PDFs. | Form-data: `file`, `excel_filename` |
| `/pdf/job_status/<job_id>` | `GET` | Polls the status of an ongoing PDF extraction job. | Path Param: `job_id` |

---

