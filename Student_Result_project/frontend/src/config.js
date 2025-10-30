// const API_BASE = window.location.hostname.includes("devtunnels.ms")
//     ? "https://wr0cjgnx-5000.inc1.devtunnels.ms"
//     : `http://${window.location.hostname}:5000`;
const API_BASE = "https://student-result-backend.onrender.com";

export default API_BASE;

export const semesterOptions = ["sem1", "sem2", "sem3", "sem4"];
export const subjectMapping = {
    sem1: {
        BMATS101: "Mathematics for CSE Stream-I",
        BCHES102: "Applied Chemistry for CSE Stream",
        BCEDK103: "Computer-Aided Engineering Drawing",
        BENGK106: "Communicative English",
        BICOK107: "Indian Constitution",
        BIDTK158: "Innovation and Design Thinking",
        BESCK104A: "Introduction to Civil Engineering",
        BETCK105H: "Introduction to Internet of Things (IoT)",
        BESCK104C: "Introduction TO Electronics Engineering",
        BPLCK105B: "Introduction TO to Python Programming",
    },
    sem2: {
        BMAT201: "Mathematics for CSE Stream-II",
        BMATS201: "Mathematics-II for CSE Stream",
        BPHYS202: "Applied Physics for CSE Stream",
        BPOPS203: "Principles of Programming Using C",
        BPWSK206: "Professional Writing Skills in English",
        BKSKK207: "Samskrutika Kannada",
        BKBKK207: "Balake Kannada",
        BSFHK258: "Scientific Foundations of Health",
        BPLCK205B: "Introduction to Python Programming",
        BESCK204C: "Introduction to Electronics Engineering",
        BESCK204D: "Introduction To Mechanical Engineering",
        BETCK205H: "Introduction to Internet of Things (IoT)",
    },
    sem3: {
        BCS301: "Mathematics for Computer Science",
        BCS302: "Digital Design & Computer Organization",
        BCS303: "Operating Systems",
        BCS304: "Data Structures and Applications",
        BCSL305: "Data Structures Lab",
        BSCK307: "Social Connect and Responsibility",
        BNSK359: "National Service Scheme (NSS)",
        BCS306A: "Object Oriented Programming with Java",
        BCS358D: "Data Visualization with Python",
    },
    sem4: {
        BCS401: "Analysis & Design of Algorithms",
        BCS402: "Microcontrollers",
        BCS403: "Database Management Systems",
        BCSL404: "Analysis & Design of Algorithms Lab",
        BBOC407: "Biology for Computer Engineers",
        BUHK408: "Universal Human Values",
        BPEK459_PhysicalEducation_OR_BNSK459_NSS_: "Physical Education or NSS",
        BCS405B: "Graph Theory",
        BCSL456D: "Technical Writing using LaTeX",
    },
};
