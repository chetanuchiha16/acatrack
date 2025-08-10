const API_BASE = window.location.hostname.includes('devtunnels.ms')
  ? 'https://ck9g3vf8-5000.inc1.devtunnels.ms'
  : `http://${window.location.hostname}:5000`;


export default API_BASE;
