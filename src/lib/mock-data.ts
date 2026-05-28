import type { LifeAreaKey } from "./design";

export type MockItem = {
  id: string;
  title: string;
  notes?: string;
  area: LifeAreaKey;
  effortMinutes: number;
  reason: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isNextAction?: boolean;
};

export type MockBlock = {
  id: string;
  kind: "focus" | "event";
  title: string;
  area?: LifeAreaKey;
  start: string;
  end: string;
};

export type MockPrinciple = {
  text: string;
  group: "meaning_and_success" | "action_and_consistency" | "health_and_bliss";
};

export type MockWorkout = {
  name: string;
  exercises: string[];
};

const todayAt = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const MOCK_TODAYS_THREE: MockItem[] = [
  {
    id: "m1",
    title: "Measure countertops & order Ikea butcher board",
    notes: "Kitchen remodel — next concrete step.",
    area: "home",
    effortMinutes: 45,
    reason: "due soon · high impact · Home is leading momentum",
    scheduledStart: todayAt(6, 0),
    scheduledEnd: todayAt(6, 45),
    isNextAction: true,
  },
  {
    id: "m2",
    title: "Push workout — bench + dips",
    area: "health",
    effortMinutes: 50,
    reason: "Health is behind target this week",
    scheduledStart: todayAt(10, 0),
    scheduledEnd: todayAt(10, 50),
  },
  {
    id: "m3",
    title: "Nova passport — gather documents",
    area: "family",
    effortMinutes: 30,
    reason: "high impact · Family neglected",
    scheduledStart: todayAt(11, 0),
    scheduledEnd: todayAt(11, 30),
  },
];

export const MOCK_BLOCKS: MockBlock[] = [
  {
    id: "b1",
    kind: "focus",
    title: "Measure countertops & order Ikea butcher board",
    area: "home",
    start: todayAt(6, 0),
    end: todayAt(6, 45),
  },
  {
    id: "b2",
    kind: "event",
    title: "Standup",
    start: todayAt(8, 30),
    end: todayAt(9, 0),
  },
  {
    id: "b3",
    kind: "focus",
    title: "Push workout",
    area: "health",
    start: todayAt(10, 0),
    end: todayAt(10, 50),
  },
  {
    id: "b4",
    kind: "focus",
    title: "Nova passport — gather documents",
    area: "family",
    start: todayAt(11, 0),
    end: todayAt(11, 30),
  },
  {
    id: "b5",
    kind: "event",
    title: "Pickleball w/ Sarah",
    start: todayAt(18, 0),
    end: todayAt(19, 0),
  },
];

export const MOCK_PRINCIPLE: MockPrinciple = {
  text: "Inspiration is perishable. Act on it immediately.",
  group: "action_and_consistency",
};

const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
  new Date().getDay()
];

const WORKOUT_SPLIT: Record<string, MockWorkout> = {
  monday: { name: "Push", exercises: ["Bench — 10 sets", "Dips — 5 sets", "Leg raises — 10×10", "Arm curls — 100/arm"] },
  tuesday: { name: "Pull", exercises: ["Bent-over rows — 3 warmup + 10 sets", "Leg raises — 10×10", "Arm curls — 100/arm"] },
  wednesday: { name: "Legs", exercises: ["Squats — 10 sets", "Leg raises — 10×10", "Arm curls — 100/arm"] },
  thursday: { name: "Push", exercises: ["Overhead press — 10 sets", "Incline press — 3 sets", "Leg raises — 10×10"] },
  friday: { name: "Pull", exercises: ["Pullups — MyCoach", "Leg raises — 10×10", "Arm curls — 100/arm"] },
  saturday: { name: "Legs", exercises: ["Romanian deadlifts — 10 sets", "Leg raises — 10×10"] },
  sunday: { name: "Active recovery", exercises: ["Run or walk"] },
};

export const MOCK_WORKOUT: MockWorkout = WORKOUT_SPLIT[dayName];

export const MOCK_STREAK = 12;
export const MOCK_RESTING = 97;
