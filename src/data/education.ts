import type { Education } from "@/types/content";

/** Most recent first. */
export const education: readonly Education[] = [
  {
    institution: "National Institute of Technology Hamirpur",
    shortName: "NIT Hamirpur",
    qualification: "B.Tech",
    field: "Computer Science and Engineering",
    start: "2019-07",
    end: "2023-06",
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

/** Test scores and academic awards, shown under the timeline. */
export const academicHighlights: readonly string[] = [
  "Class 10 (CBSE, 2017): 10.0 CGPA, awarded a central government scholarship",
  "Class 12 (CBSE, 2019): 92.2% overall (Physics 93/100, Computer Science 91/100)",
  "SAT: 2200/2400 (Math, Physics, Chemistry)",
];
