// cspell:ignore Sadman
// Shared teacher roster for the L/W/R/S Teacher dropdowns on the TRF and
// Home-Based TRF admin pages, so the two pages can't silently drift apart.
export const TEACHER_EMAIL_MAP: Record<string, string> = {
  Prima: "prima.luminedge@gmail.com",
  Neelima: "neelima.luminedge2023@gmail.com",
  Raisa: "raisa.luminedge@gmail.com",
  Rafi: "rafi.luminedge@gmail.com",
  Saiham: "saiham.luminedge@gmail.com",
  Iffat: "iffat.luminedge@gmail.com",
  Najia: "najia.luminedge@gmail.com",
  Sazzadur: "sazzadur.luminedge@gmail.com",
  Sadman: "salim.sadman.luminedge@gmail.com",
  // Rahul: "rahul1921@cseku.ac.bd",
};

// Teachers who are no longer selectable in the dropdown (removed from
// TEACHER_EMAIL_MAP) but may still be assigned on existing bookings. Kept
// separately so ALL_TEACHER_EMAIL_MAP below can still resolve their name from
// an email on old records, without making them selectable again.
export const LEGACY_TEACHER_EMAIL_MAP: Record<string, string> = {
  Tamim: "tamim.luminedge@gmail.com",
  Tanvir: "tanvirkhan.luminedge@gmail.com",
  Mubasshira: "mubasshira.luminedge@gmail.com",
};

// Full roster (selectable + legacy), for reverse email->name lookups and
// other display purposes only — never use this to populate a dropdown.
export const ALL_TEACHER_EMAIL_MAP: Record<string, string> = {
  ...TEACHER_EMAIL_MAP,
  ...LEGACY_TEACHER_EMAIL_MAP,
};

// Kept for Tamim/Tanvir/Mubasshira (removed from TEACHER_EMAIL_MAP, so no
// longer selectable) so any existing assignment to one of them still shows
// its distinct color instead of falling back to the default white.
export const TEACHER_COLOR_MAP: Record<string, string> = {
  Prima: "bg-green-500 text-white",
  Neelima: "bg-blue-600 text-white",
  Tamim: "bg-yellow-500 text-black",
  Raisa: "bg-red-600 text-white",
  Rafi: "bg-indigo-600 text-white",
  Saiham: "bg-emerald-600 text-white",
  Tanvir: "bg-purple-600 text-white",
  Iffat: "bg-pink-600 text-white",
  Najia: "bg-cyan-600 text-white",
  Sazzadur: "bg-lime-600 text-white",
  Mubasshira: "bg-rose-600 text-white",
  Sadman: "bg-orange-600 text-white",
  // Rahul: "bg-teal-600 text-white" / "bg-gray-600 text-white",
};

if (process.env.NODE_ENV !== "production") {
  const missing = Object.keys(TEACHER_COLOR_MAP).filter(
    (name) => !(name in ALL_TEACHER_EMAIL_MAP)
  );
  if (missing.length > 0) {
    console.warn(
      `teachers.ts: TEACHER_COLOR_MAP has color(s) for teacher(s) with no email in ALL_TEACHER_EMAIL_MAP: ${missing.join(
        ", "
      )}. Add them to TEACHER_EMAIL_MAP or LEGACY_TEACHER_EMAIL_MAP so reverse email lookups keep working.`
    );
  }
}

export const getTeacherBgClass = (value: string): string =>
  TEACHER_COLOR_MAP[value] || "bg-white text-black";
