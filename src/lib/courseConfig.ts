export const courseLinks: Record<string, string> = {
  IELTS: "https://luminedge.com.bd/ielts/",
  "Pearson PTE": "https://luminedge.com.bd/pte/",
  GRE: "https://luminedge.com.bd/gre/",
  TOEFL: "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/",
};

export const courseDescriptions: Record<string, string> = {
  IELTS:
    "Book Your IELTS Test with Confidence – Convenient, Reliable, and Trusted by Thousands.",
  "Pearson PTE": "Book Your PTE Mock Test – Practice, Prepare, and Excel!",
  GRE: "Book Your GRE General Mock Test – Ace Your Preparation!",
  TOEFL: "Book Your TOEFL iBT Mock Test – Get Ready to Succeed!",
};

// Courses that may be booked as a Home-Based test. Combined with the user's
// Computer-Based mock check at booking time (both must hold): Home is allowed
// iff the mock is Computer-Based AND the course is flagged true here.
export const homeBasedCourses: Record<string, boolean> = {
  IELTS: true,
  "Pearson PTE": true,
  GRE: false,
  TOEFL: false,
};
