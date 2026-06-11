import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

// Custom trends to track sandbox initialization and request performance
const route_student_analysis_api = new Trend('sandbox_student_analysis_api');
const route_student_details_api = new Trend('sandbox_student_details_api');
const route_pdf_report_api = new Trend('sandbox_pdf_report_api');
const route_overall_res_api = new Trend('sandbox_overall_res_api');
const route_mentor_students_list_api = new Trend('sandbox_mentor_students_list_api');
const route_mentor_meetings_api = new Trend('sandbox_mentor_meetings_api');
const route_parent_student_details_api = new Trend('sandbox_parent_student_details_api');

const routeTrends = {
    'Student Analysis API': route_student_analysis_api,
    'Student Details API': route_student_details_api,
    'PDF Report API': route_pdf_report_api,
    'Overall Res API': route_overall_res_api,
    'Mentor Students List API': route_mentor_students_list_api,
    'Mentor Meetings API': route_mentor_meetings_api,
    'Parent Student Details API': route_parent_student_details_api,
};

function getTrend(name) {
    return routeTrends[name];
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const SEMESTER = __ENV.SEMESTER || 'sem1';
const MENTOR_ID = '1'; // Default mentor ID in the seeded sandbox

export const options = {
  stages: [
    { duration: '5s', target: 10 },  // Ramp-up to 10 VUs over 5 seconds (triggers concurrent DB creations)
    { duration: '20s', target: 10 }, // Hold 10 VUs to run database operations
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    // Assert overall HTTP request duration
    http_req_duration: ['p(95)<4000'], // Allow 4s for DB initialization on first request
    http_req_failed: ['rate<0.05'],    // Under 5% error rate
  },
};

export default function () {
  // Generate a unique sandbox session ID for each Virtual User
  const sessionId = `loadtest_vu_${__VU}`;
  
  // Distribute VUs across the 15 seeded sandbox student USNs
  const usnIndex = (__VU % 15) + 1;
  const usnStr = String(usnIndex).padStart(3, '0');
  const studentUSN = `1XX23CS${usnStr}`;

  group(`Sandbox Performance (VU ${__VU} - Session: ${sessionId})`, function () {
    let studentToken, staffToken, parentToken;

    // Headers container carrying the critical X-Demo-Session-ID header
    const baseHeaders = {
        'X-Demo-Session-ID': sessionId,
        'Content-Type': 'application/json'
    };

    group('Sandbox Login and Initialization', function() {
        // 1. Student Login (Triggers creation & seeding of sandbox DB on first hit)
        const studentLogin = JSON.stringify({
           who: "Student",
           username: studentUSN,
           password: "password123"
        });
        const studentRes = http.post(`${BASE_URL}/auth`, studentLogin, {
           headers: baseHeaders,
           tags: { name: 'Student Login' }
        });
        check(studentRes, { 'Student Login status is 200': (r) => r.status === 200 });
        if (studentRes.status === 200) { studentToken = studentRes.json('token'); }

        // 2. Staff Login
        const staffLogin = JSON.stringify({
           who: "Staff",
           username: "demo_teacher",
           password: "password123",
           batch_year: "2023"
        });
        const staffRes = http.post(`${BASE_URL}/auth`, staffLogin, {
           headers: baseHeaders,
           tags: { name: 'Staff Login' }
        });
        check(staffRes, { 'Staff Login status is 200': (r) => r.status === 200 });
        if (staffRes.status === 200) { staffToken = staffRes.json('token'); }

        // 3. Parent Login
        const parentLogin = JSON.stringify({
           who: "Parent",
           username: `${studentUSN}_parent`,
           password: "password123"
        });
        const parentRes = http.post(`${BASE_URL}/auth`, parentLogin, {
           headers: baseHeaders,
           tags: { name: 'Parent Login' }
        });
        check(parentRes, { 'Parent Login status is 200': (r) => r.status === 200 });
        if (parentRes.status === 200) { parentToken = parentRes.json('token'); }
    });

    const getParams = (token, name) => {
        return { 
            headers: Object.assign({}, baseHeaders, { 'Authorization': `Bearer ${token}` }), 
            tags: { name }
        };
    };

    // Helper to track metrics
    function track(res, name) {
        const trend = getTrend(name);
        if (trend) {
            trend.add(res.timings.duration);
        }
        return res;
    }

    // ==========================================
    // Student Sandbox Endpoints
    // ==========================================
    if (studentToken) {
        group('Student Endpoints', function () {
            group('Student Analysis API', function () {
              const res = track(http.get(`${BASE_URL}/auth/Student/analysis?usn=${studentUSN}&semester=${SEMESTER}`, getParams(studentToken, 'Student Analysis API')), 'Student Analysis API');
              check(res, { 'status is 200': (r) => r.status === 200 });
            });

            group('Student Details API', function () {
              const res = track(http.get(`${BASE_URL}/auth/Student/details`, getParams(studentToken, 'Student Details API')), 'Student Details API');
              check(res, { 'status is 200': (r) => r.status === 200 });
            });

            group('PDF Report API', function () {
              const res = track(http.get(`${BASE_URL}/auth/Student/result?usn=${studentUSN}&semester=${SEMESTER}`, getParams(studentToken, 'PDF Report API')), 'PDF Report API');
              check(res, { 'status is 200': (r) => r.status === 200 });
            });
        });
    }

    // ==========================================
    // Staff Sandbox Endpoints
    // ==========================================
    if (staffToken) {
        group('Staff Endpoints', function() {
            group('Overall Res API', function () {
               const res = track(http.get(`${BASE_URL}/auth/Staff/overall_res?semester=${SEMESTER}&section=D`, getParams(staffToken, 'Overall Res API')), 'Overall Res API');
               check(res, { 'status is 200': (r) => r.status === 200 });
            });

            group('Mentor Students List API', function () {
               const res = track(http.get(`${BASE_URL}/mentor/${MENTOR_ID}/students`, getParams(staffToken, 'Mentor Students List API')), 'Mentor Students List API');
               check(res, { 'status is 200': (r) => r.status === 200 });
            });

            group('Mentor Meetings API', function () {
               const res = track(http.get(`${BASE_URL}/auth/Staff/Mentor/meeting/${MENTOR_ID}`, getParams(staffToken, 'Mentor Meetings API')), 'Mentor Meetings API');
               check(res, { 'status is 200': (r) => r.status === 200 });
            });
        });
    }

    // ==========================================
    // Parent Sandbox Endpoints
    // ==========================================
    if (parentToken) {
        group('Parent Endpoints', function() {
            group('Parent Student Details API', function () {
               const res = track(http.get(`${BASE_URL}/parent/student-details`, getParams(parentToken, 'Parent Student Details API')), 'Parent Student Details API');
               check(res, { 'status is 200': (r) => r.status === 200 });
            });
        });
    }

  });

  sleep(1);
}
