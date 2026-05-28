import { DailyDriveHeader } from "@/components/drive/DailyDriveHeader";
import { TodaysFocus } from "@/components/drive/TodaysFocus";
import { ScheduleStrip } from "@/components/drive/ScheduleStrip";
import { PrincipleCard } from "@/components/drive/PrincipleCard";
import { WorkoutCard } from "@/components/drive/WorkoutCard";
import {
  MOCK_BLOCKS,
  MOCK_PRINCIPLE,
  MOCK_RESTING,
  MOCK_STREAK,
  MOCK_TODAYS_THREE,
  MOCK_WORKOUT,
} from "@/lib/mock-data";

export default function DailyDrivePage() {
  return (
    <main className="flex flex-col">
      <DailyDriveHeader name="Markus" streak={MOCK_STREAK} resting={MOCK_RESTING} />
      <TodaysFocus items={MOCK_TODAYS_THREE} />
      <ScheduleStrip blocks={MOCK_BLOCKS} />
      <PrincipleCard text={MOCK_PRINCIPLE.text} group={MOCK_PRINCIPLE.group} />
      <WorkoutCard name={MOCK_WORKOUT.name} exercises={MOCK_WORKOUT.exercises} />
    </main>
  );
}
