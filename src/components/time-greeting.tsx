"use client";

import { useEffect, useState } from "react";

function greetingForDate(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TimeGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    function updateGreeting() {
      setGreeting(greetingForDate(new Date()));
    }

    updateGreeting();
    const intervalId = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
      {greeting}, {name}
    </h2>
  );
}
