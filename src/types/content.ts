import type { StaticImageData } from "next/image";

/** "YYYY-MM", e.g. "2023-04". Month precision is enough for CV-style dates. */
export type YearMonth = `${number}-${number}`;

/** "YYYY-MM-DD". */
export type IsoDate = `${number}-${number}-${number}`;

export type About = {
  /** Bio paragraphs, rendered in order. */
  bio: readonly string[];
  focusAreas: readonly string[];
  interests: readonly string[];
};

export type WorkExperience = {
  company: string;
  role: string;
  location?: string;
  start: YearMonth;
  /** Omit for a current role. */
  end?: YearMonth;
  summary?: string;
  highlights?: readonly string[];
  technologies?: readonly string[];
};

export type Education = {
  institution: string;
  qualification: string;
  field?: string;
  location?: string;
  start: YearMonth;
  end?: YearMonth;
  notes?: readonly string[];
};

export type BookStatus = "reading" | "read" | "to-read";

export type Book = {
  title: string;
  author: string;
  status: BookStatus;
  /** When you finished it (status "read"). */
  finished?: YearMonth;
  /** Your takeaway, in a sentence or two. */
  note?: string;
  url?: string;
};

export type Thought = {
  /** URL fragment: /thoughts/#<slug>. Lowercase, hyphenated, unique. */
  slug: string;
  title: string;
  date: IsoDate;
  /** Paragraphs, rendered in order. */
  body: readonly string[];
  tags?: readonly string[];
};

export type PersonalRecord = {
  /** e.g. "5K", "Half marathon", "Deadlift". */
  event: string;
  /** Display value as you want it shown, e.g. "22:41" or "140 kg". */
  result: string;
  date: IsoDate;
  /** Race or place, e.g. "Mumbai Marathon". */
  context?: string;
  /** Optional link to a result page or activity log. */
  url?: string;
};

/** "YYYY", "YYYY-MM" or "YYYY-MM-DD": as precise as you know it. */
export type PictureDate = `${number}` | YearMonth | IsoDate;

export type Picture = {
  /** A static import from src/assets/pictures/ (gives size and blur preview). */
  image: StaticImageData;
  /** Describes the photo for screen readers. Required. */
  alt: string;
  date: PictureDate;
  caption?: string;
  location?: string;
};
