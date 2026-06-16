export const SCHOOL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const SCHOOL_MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

export type SchoolDay = (typeof SCHOOL_DAYS)[number];
export type SchoolMeal = (typeof SCHOOL_MEALS)[number];

export function isSchoolDay(value: string): value is SchoolDay {
  return (SCHOOL_DAYS as readonly string[]).includes(value);
}

export function isSchoolMeal(value: string): value is SchoolMeal {
  return (SCHOOL_MEALS as readonly string[]).includes(value);
}
