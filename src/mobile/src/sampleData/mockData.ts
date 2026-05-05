import {
  Account,
  CheckinHistoryItem,
  ManagedWorkshop,
  OfflineQueueItem,
  OrganizerStats,
  Registration,
  Workshop,
} from "../models/types";

export const sampleAccounts: Account[] = [
  {
    id: "stu-23100421",
    name: "Nguyen Van An",
    email: "student@unihub.test",
    password: "123456",
    role: "STUDENT",
    label: "Student",
    studentId: "23100421",
  },
  {
    id: "staff-door-a",
    name: "Tran Thi Binh",
    email: "checkin@unihub.test",
    password: "123456",
    role: "CHECKIN_STAFF",
    label: "Check-in Staff",
  },
  {
    id: "org-demo",
    name: "Le Minh Quan",
    email: "organizer@unihub.test",
    password: "123456",
    role: "ORGANIZER",
    label: "Organizer/Admin",
  },
];

export const sampleWorkshops: Workshop[] = [
  {
    id: "w-ai-career",
    title: "AI Tools for Career Readiness",
    speaker: "Dr. An Nguyen",
    speakerTitle: "AI Program Lead, UniHub Lab",
    speakerBio:
      "Research lead helping students use AI tools responsibly for academic and career projects.",
    date: "May 12, 2026",
    startTime: "09:00",
    endTime: "11:00",
    time: "09:00 - 11:00",
    room: "A101",
    roomHint: "Building A, first floor, next to the career center.",
    remainingSeats: 18,
    capacity: 80,
    feeType: "FREE",
    feeAmount: 0,
    description:
      "Students learn how to use AI for portfolio planning, mock interviews, and internship research while respecting university policy.",
    summary:
      "A practical roadmap for using AI tools in portfolios, interviews, and early career projects without losing academic integrity.",
    tags: ["AI", "Career", "Beginner"],
    status: "PUBLISHED",
  },
  {
    id: "w-system-design",
    title: "System Design Under Traffic Spikes",
    speaker: "Ms. Ha Le, Senior Backend Engineer",
    speakerTitle: "Senior Backend Engineer, CloudScale",
    speakerBio:
      "Backend engineer specializing in payments, traffic spikes, and resilient registration systems.",
    date: "May 12, 2026",
    startTime: "13:30",
    endTime: "15:30",
    time: "13:30 - 15:30",
    room: "B203",
    roomHint: "Building B, second floor, east elevator.",
    remainingSeats: 6,
    capacity: 48,
    feeType: "PAID",
    feeAmount: 100000,
    description:
      "A practical system design workshop based on high-concurrency registration, idempotency, and payment outage scenarios.",
    summary:
      "Covers rate limits, idempotency keys, payment isolation, and database locking through a registration opening day case study.",
    tags: ["Backend", "Payment", "Advanced"],
    status: "PUBLISHED",
  },
  {
    id: "w-cv-lab",
    title: "CV Review Lab",
    speaker: "Career Center Mentors",
    speakerTitle: "UniHub Career Center",
    speakerBio:
      "Career mentors with experience screening student internship CVs for local technology companies.",
    date: "May 13, 2026",
    startTime: "10:00",
    endTime: "12:00",
    time: "10:00 - 12:00",
    room: "Hall C",
    roomHint: "Main hall, check-in desk near the south entrance.",
    remainingSeats: 0,
    capacity: 32,
    feeType: "FREE",
    feeAmount: 0,
    description:
      "Small group feedback sessions for students preparing internship and fresher applications.",
    summary:
      "Small-group resume reviews with concrete rewrite suggestions and recruiter-style feedback for internship applications.",
    tags: ["CV", "Internship", "Full"],
    status: "FULL",
  },
  {
    id: "w-cloud",
    title: "Cloud Computing Starter Kit",
    speaker: "Mr. Duc Pham",
    speakerTitle: "Solutions Architect",
    speakerBio:
      "Cloud solutions architect coaching student teams on deployment, observability, and cost control.",
    date: "May 14, 2026",
    startTime: "08:30",
    endTime: "10:30",
    time: "08:30 - 10:30",
    room: "B305",
    roomHint: "Building B, third floor, lab wing.",
    remainingSeats: 24,
    capacity: 64,
    feeType: "PAID",
    feeAmount: 75000,
    description:
      "Hands-on introduction to hosting student projects on cloud platforms with practical deployment checklists.",
    summary:
      "A hands-on overview of cloud deployment, environment variables, logs, and cost-aware student project hosting.",
    tags: ["Cloud", "DevOps", "Hands-on"],
    status: "DRAFT",
  },
  {
    id: "w-interview",
    title: "Interview Practice with Recruiters",
    speaker: "Ms. Thao Tran",
    speakerTitle: "Technical Recruiter",
    speakerBio:
      "Recruiter running technical interview practice sessions for software engineering students.",
    date: "May 15, 2026",
    startTime: "14:00",
    endTime: "16:00",
    time: "14:00 - 16:00",
    room: "Hall C",
    roomHint: "Career week stage area with recruiter tables.",
    remainingSeats: 20,
    capacity: 60,
    feeType: "FREE",
    feeAmount: 0,
    description:
      "Mock interview rotations covering behavioral prompts, project explanation, and recruiter follow-up questions.",
    summary:
      "Students practice interview answers with recruiters and leave with concrete improvement notes.",
    tags: ["Interview", "Recruiting", "Practice"],
    status: "PUBLISHED",
  },
  {
    id: "w-software-design",
    title: "Software Design for Real Projects",
    speaker: "Mr. Khoa Bui",
    speakerTitle: "Software Architect",
    speakerBio:
      "Architect mentoring student capstone teams on modular design and maintainable codebases.",
    date: "May 16, 2026",
    startTime: "09:30",
    endTime: "11:30",
    time: "09:30 - 11:30",
    room: "B203",
    roomHint: "Second floor workshop room with projector and whiteboards.",
    remainingSeats: 0,
    capacity: 40,
    feeType: "PAID",
    feeAmount: 90000,
    description:
      "Design tradeoffs, module boundaries, and review habits for student teams building real course projects.",
    summary:
      "A focused session on turning requirements into clean modules, testable flows, and explainable architecture.",
    tags: ["Design", "Architecture", "Projects"],
    status: "CANCELLED",
  },
];

export const sampleRegistrations: Registration[] = [
  {
    id: "reg-ai-career",
    workshopId: "w-ai-career",
    workshopTitle: "AI Tools for Career Readiness",
    status: "CONFIRMED",
    qrToken: "UNI-STUDENT-23100421-AI-CAREER",
    message: "Registration confirmed. Your QR ticket is ready.",
    notification:
      "Confirmation sent: AI Tools for Career Readiness, A101, May 12 at 09:00.",
  },
];

export const sampleOfflineQueue: OfflineQueueItem[] = [
  {
    id: "sync-001",
    studentName: "Ngoc Mai",
    workshopTitle: "AI Tools for Career Readiness",
    scannedAt: "08:54",
    status: "PENDING_SYNC",
  },
  {
    id: "sync-002",
    studentName: "Quang Vo",
    workshopTitle: "System Design Under Traffic Spikes",
    scannedAt: "13:18",
    status: "PENDING_SYNC",
  },
];

export const sampleCheckinHistory: CheckinHistoryItem[] = [
  {
    id: "hist-001",
    studentName: "Nguyen Van An",
    studentId: "23100421",
    workshopTitle: "AI Tools for Career Readiness",
    checkedInAt: "08:48",
    status: "VALID",
  },
  {
    id: "hist-002",
    studentName: "Pham Quang Huy",
    studentId: "23101088",
    workshopTitle: "CV Review Lab",
    checkedInAt: "09:55",
    status: "OFFLINE_SYNCED",
  },
];

export const sampleOrganizerStats: OrganizerStats = {
  totalWorkshops: 12,
  totalRegistrations: 486,
  checkedInCount: 214,
  paidRegistrationCount: 128,
  cancelledWorkshops: 1,
};

export const sampleManagedWorkshops: ManagedWorkshop[] = sampleWorkshops.map(
  (workshop, index) => ({
    ...workshop,
    registrations: [62, 42, 32, 39, 28, 0][index] ?? 20,
    checkedIn: [35, 18, 11, 0, 9, 0][index] ?? 0,
    revenue: workshop.feeType === "PAID" ? workshop.feeAmount * (index + 18) : 0,
  }),
);
