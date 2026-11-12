import type { AcademicScore, Education } from "@/types/content";

/** Most recent first. */
export const education: readonly Education[] = [
  {
    institution: "National Institute of Technology Hamirpur",
    shortName: "NIT Hamirpur",
    qualification: "B.Tech",
    field: "Computer Science and Engineering",
    start: "2019-07",
    end: "2023-06",
    notes: ["CGPA 8.6"],
  },
  {
    institution: "Kendriya Vidyalaya",
    qualification: "Intermediate (CBSE Class 12)",
    start: "2018-03",
    end: "2019-03",
    notes: [
      "Mathematics, Computer Science, Physics, Chemistry, English",
      "92.2% overall (Physics 93/100, Computer Science 91/100)",
    ],
  },
];

/** Test scores, shown as meters under the timeline. */
export const academicScores: readonly AcademicScore[] = [
  { label: "B.Tech", detail: "NIT Hamirpur, 2023", score: 8.6, outOf: 10, display: "8.6 CGPA" },
  {
    label: "Class 10",
    detail: "CBSE, 2017",
    score: 10,
    outOf: 10,
    display: "10.0 CGPA",
    note: "Awarded a central government scholarship",
  },
  {
    label: "Class 12",
    detail: "CBSE, 2019",
    score: 92.2,
    outOf: 100,
    display: "92.2%",
    note: "Physics 93/100, Computer Science 91/100",
  },
  { label: "SAT", detail: "Math, Physics, Chemistry", score: 2200, outOf: 2400, display: "2200 / 2400" },
];
