import { Entry, localDate } from "./types";
export function demoEntries(): Entry[] {
  const date = localDate();
  return [
    {
      id: "demo-1",
      owner_id: "demo",
      type: "text",
      title: "The lovely little in-between",
      body: "Took the long way home today. The air felt a little softer, and for once I wasn’t in a hurry. A reminder to make room for these small, ordinary moments.",
      entry_date: date,
      created_at: date + "T15:30:00Z",
      space_id: null,
      metadata: {},
      media_path: null,
    },
    {
      id: "demo-2",
      owner_id: "demo",
      type: "meal",
      title: "Slow mornings & avocado toast",
      body: "A little lemon, a little chili, and my favorite cup of coffee.",
      entry_date: date,
      created_at: date + "T08:15:00Z",
      space_id: null,
      metadata: { meal: "Breakfast", time: "08:15" },
      media_path: null,
      media_url:
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=85",
    },
    {
      id: "demo-3",
      owner_id: "demo",
      type: "achievement",
      title: "Made time for myself",
      body: "Twenty minutes of reading, phone on silent. A small win that felt big.",
      entry_date: date,
      created_at: date + "T12:00:00Z",
      space_id: null,
      metadata: {},
      media_path: null,
    },
  ];
}
