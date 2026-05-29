import { redirect } from "next/navigation";

export default function NewHabitPage() {
  // The HabitList page handles inline creation. This route is here so external
  // links / share targets can deep-link the user to the add flow.
  redirect("/habits?add=1");
}
