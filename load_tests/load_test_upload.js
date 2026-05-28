import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const route_upload_api = new Trend('route_upload_api');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const BATCH_YEAR = __ENV.BATCH_YEAR || '2023';
const ADMIN_SECRET = __ENV.ADMIN_SECRET || 'supersecretkey';

// Load the ZIP file in binary mode
const zipFileBin = open('/home/chetan/Documents/Projects/dep/2023_SEM5.zip', 'b');

export const options = {
  vus: 1,
  iterations: 4,  // Match Python benchmark: 4 requests × 327 PDFs = 1,308 PDFs total
  thresholds: {
    http_req_duration: ['p(95)<30000'], // Expect 95% of requests to finish under 30s for large files
    http_req_failed: ['rate<0.05'],     // Assert error rate is under 5%
  },
};

export default function () {
  const url = `${BASE_URL}/pdftoexcel/upload?batch_year=${BATCH_YEAR}`;
  
  const payload = {
    file: http.file(zipFileBin, '2023_SEM5.zip', 'application/zip'),
  };

  const params = {
    headers: {
      'X-Admin-Secret': ADMIN_SECRET,
    },
    tags: { name: 'PDF-to-Excel Upload' },
    timeout: '30s', // 30s timeout for large uploads
  };

  const res = http.post(url, payload, params);

  check(res, {
    'upload status is 200': (r) => r.status === 200,
    'job_id is returned': (r) => r.status === 200 && r.json('job_id') !== undefined,
  });

  route_upload_api.add(res.timings.duration);

  sleep(1);
}
