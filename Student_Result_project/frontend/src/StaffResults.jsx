// import { useState } from "react";
// import axios from "axios";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// export default function StaffResults() {
//   const [semester, setSemester] = useState("");
//   const [subject, setSubject] = useState("");
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // API fetch helper
//   const fetchData = async (url) => {
//     try {
//       setLoading(true);
//       const res = await axios.get(url);
//       setData(res.data);
//     } catch (err) {
//       console.error(err);
//       setData({ error: "Failed to fetch" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // PDF download helper
//   const downloadPDF = (url, filename) => {
//     axios.get(url, { responseType: "blob" }).then((res) => {
//       const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
//       const link = document.createElement("a");
//       link.href = urlBlob;
//       link.setAttribute("download", filename);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     });
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6">
//       <h1 className="text-2xl font-bold mb-6">Staff Results Dashboard</h1>

//       <Tabs defaultValue="semester" className="w-full">
//         <TabsList className="mb-6">
//           <TabsTrigger value="semester">Semester Results</TabsTrigger>
//           <TabsTrigger value="subject">Subject Results</TabsTrigger>
//           <TabsTrigger value="overall">Overall Performance</TabsTrigger>
//         </TabsList>

//         {/* SEMESTER RESULTS */}
//         <TabsContent value="semester">
//           <div className="flex gap-2 mb-4">
//             <Input
//               placeholder="Enter Semester (e.g. SEM4)"
//               value={semester}
//               onChange={(e) => setSemester(e.target.value)}
//             />
//             <Button onClick={() => fetchData(`/auth/Staff/sem_res?semester=${semester}`)}>Get Results</Button>
//           </div>
//           {loading && <p>Loading...</p>}
//           {data && !data.error && (
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Subject Code</TableHead>
//                   <TableHead>Total</TableHead>
//                   <TableHead>Present</TableHead>
//                   <TableHead>Absent</TableHead>
//                   <TableHead>Pass %</TableHead>
//                   <TableHead>FCD</TableHead>
//                   <TableHead>FC</TableHead>
//                   <TableHead>SC</TableHead>
//                   <TableHead>Fail</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {data.results?.map((row) => (
//                   <TableRow key={row.subject_code}>
//                     <TableCell>{row.subject_code}</TableCell>
//                     <TableCell>{row.total_students}</TableCell>
//                     <TableCell>{row.present_students}</TableCell>
//                     <TableCell>{row.absent_students}</TableCell>
//                     <TableCell>{row.pass_percentage}%</TableCell>
//                     <TableCell>{row.fcd_count}</TableCell>
//                     <TableCell>{row.fc_count}</TableCell>
//                     <TableCell>{row.sc_count}</TableCell>
//                     <TableCell>{row.fail_count}</TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           )}
//           {data?.error && <p className="text-red-500">{data.error}</p>}
//         </TabsContent>

//         {/* SUBJECT RESULTS */}
//         <TabsContent value="subject">
//           <div className="flex gap-2 mb-4">
//             <Input
//               placeholder="Semester (e.g. SEM4)"
//               value={semester}
//               onChange={(e) => setSemester(e.target.value)}
//             />
//             <Input
//               placeholder="Subject Code"
//               value={subject}
//               onChange={(e) => setSubject(e.target.value)}
//             />
//             <Button
//               onClick={() =>
//                 fetchData(`/auth/Staff/sub_res?semester=${semester}&subject=${subject}`)
//               }
//             >
//               Get Results
//             </Button>
//             <Button
//               variant="secondary"
//               onClick={() =>
//                 downloadPDF(`/auth/Staff/sub_res/report?semester=${semester}&subject=${subject}`, `${subject}_report.pdf`)
//               }
//             >
//               Download PDF
//             </Button>
//           </div>
//           {loading && <p>Loading...</p>}
//           {data && !data.error && (
//             <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
//           )}
//           {data?.error && <p className="text-red-500">{data.error}</p>}
//         </TabsContent>

//         {/* OVERALL PERFORMANCE */}
//         <TabsContent value="overall">
//           <div className="flex gap-2 mb-4">
//             <Input
//               placeholder="Semester (e.g. SEM4)"
//               value={semester}
//               onChange={(e) => setSemester(e.target.value)}
//             />
//             <Button
//               onClick={() =>
//                 fetchData(`/auth/Staff/overall_res?semester=${semester}`)
//               }
//             >
//               Get Overall
//             </Button>
//             <Button
//               variant="secondary"
//               onClick={() =>
//                 fetchData(`/auth/Staff/overall_res?semester=${semester}&show_toppers=true`)
//               }
//             >
//               Show Toppers
//             </Button>
//             <Button
//               variant="secondary"
//               onClick={() =>
//                 fetchData(`/auth/Staff/overall_res?semester=${semester}&show_failed=true`)
//               }
//             >
//               Show Failed
//             </Button>
//             <Button
//               onClick={() =>
//                 downloadPDF(`/auth/Staff/report/${semester}`, `${semester}_report.pdf`)
//               }
//             >
//               Download Report
//             </Button>
//           </div>
//           {loading && <p>Loading...</p>}
//           {data && !data.error && (
//             <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
//           )}
//           {data?.error && <p className="text-red-500">{data.error}</p>}
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
