import http from 'k6/http';
import { check, sleep, group } from 'k6';

// Read environment variables or use defaults
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const USN = __ENV.USN || '1JS23CS032'; // Example USN, can be passed via k6 run -e USN=123
const SEMESTER = __ENV.SEMESTER || 'sem1';

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up to 20 users over 5 seconds
    { duration: '30s', target: 20 }, // Hold 20 users for 30 seconds
    { duration: '5s', target: 0 },   // Ramp-down to 0 users over 5 seconds
  ],
  thresholds: {
    // Assert overall HTTP request duration
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 2000ms
    // Assert error rate is low
    http_req_failed: ['rate<0.05'],    // Less than 5% failure rate
  },
};

// Note: to use crypto in k6 we import from 'k6/crypto' but for JWT generation
// it's often easier to just make a real request to the login endpoint.

export default function () {
  group('Backend Performance Tests', function () {
    
    // We get a token for the student
    let token;
    group('Login to get token', function() {
        const loginPayload = JSON.stringify({
           who: "Student",
           username: USN,
           password: "CHET032" // Replace with valid password or we handle 401
        });
        const loginRes = http.post(`${BASE_URL}/auth`, loginPayload, {
           headers: { 'Content-Type': 'application/json' }
        });
        
        // If login fails we might not have a valid user, so testing will fail gracefully
        if (loginRes.status === 200) {
           token = loginRes.json('token');
        }
    });

    const params = {
      headers: {
        'Authorization': `Bearer ${token || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    };

    // 1. Baseline Health Check
    group('Health Check', function () {
      const res = http.get(`${BASE_URL}/health`);
      check(res, {
        'status is 200': (r) => r.status === 200,
        'is ok': (r) => r.status === 200 && r.json('status') === 'ok',
      });
    });

    // 2. Student Analytics & Regression
    group('Student Analysis API', function () {
      const res = http.get(`${BASE_URL}/auth/Student/analysis?usn=${USN}&semester=${SEMESTER}`, params);
      check(res, {
        'status is 200': (r) => r.status === 200,
        'has study summary': (r) => {
           try {
              if (r.status !== 200) return false;
              return r.json('study_summary') !== undefined;
           } catch (e) {
              return false;
           }
        }
      });
    });

    // 3. Matplotlib Chart Generation 
    group('Chart Generation API', function () {
      const res = http.get(`${BASE_URL}/auth/Student/chart?usn=${USN}&semester=${SEMESTER}`, params);
      check(res, {
        'status is 200': (r) => r.status === 200,
        'has base64 image data': (r) => {
           try {
              if (r.status !== 200) return false;
              return r.json('image').startsWith('data:image/png;base64');
           } catch (e) {
              return false;
           }
        }
      });
    });

    // 4. PDF Report Generation
    group('PDF Report API', function () {
      const res = http.get(`${BASE_URL}/auth/Student/result?usn=${USN}&semester=${SEMESTER}`, params);
      check(res, {
        'status is 200': (r) => r.status === 200,
        'has base64 pdf data': (r) => {
           try {
              if (r.status !== 200) return false;
              return r.json('pdf_url').startsWith('data:application/pdf;base64');
           } catch (e) {
              return false;
           }
        }
      });
    });

  });

  // Wait 1 second before the user makes another request
  sleep(1);
}
