export interface Course {
  _id: string;
  name: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}
export type TimeSlot = {
    slotId: string;
    startTime: string; // e.g., "08:00:00"
    endTime: string;   // e.g., "08:30:00"
    slot: number;
  };
  
  export type Schedule = {
    _id: string;             // Unique identifier for the schedule
    courseId: string;        // ID of the course associated with this schedule
    startDate: string;       // Start date in "YYYY-MM-DD" format
    endDate: string;         // End date in "YYYY-MM-DD" format
    timeSlots: TimeSlot[];   // Array of time slots
    testSystem: string;      // Type of test system, e.g., "Computer-Based"
    testType: string;        // Type of test, e.g., "IELTS"
    status: string;          // Status of the schedule, e.g., "Scheduled"
  };
  

