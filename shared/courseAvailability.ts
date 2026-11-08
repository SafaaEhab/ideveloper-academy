/**
 * Course availability is persisted in `academy_course_offerings`; these are the
 * defaults used only when a row has to be created for the first time. Both the
 * admin and the public site read the database afterwards, never this constant.
 */
export type CourseOfferingStatus = "live" | "coming_soon" | "waiting_list";

export const COURSE_NAMES = ["Scratch", "Robotics", "Web", "Python"] as const;
export type CourseName = (typeof COURSE_NAMES)[number];

/**
 * Derived from the admin workspace at the time of the audit: Python was live
 * and the other three were "Coming soon". A migration seeds exactly these
 * values, and `ensureCourseOfferings` only inserts rows that do not exist.
 */
export const DEFAULT_COURSE_STATUS: Record<CourseName, CourseOfferingStatus> = {
  Scratch: "coming_soon",
  Robotics: "coming_soon",
  Web: "coming_soon",
  Python: "live",
};

export const COURSE_STATUS_LABELS: Record<CourseOfferingStatus, string> = {
  live: "Live",
  coming_soon: "Coming soon",
  waiting_list: "Waiting list",
};

/** The public card's call to action for a given status. */
export function courseActionFor(status: CourseOfferingStatus):
  | { kind: "enrol"; label: string }
  | { kind: "waiting_list"; label: string } {
  if (status === "live") return { kind: "enrol", label: "Book your spot" };
  return { kind: "waiting_list", label: "Join waiting list" };
}
