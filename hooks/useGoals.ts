"use client";

import { useCallback, useEffect, useState } from "react";
import { createGoal, loadGoals, saveGoals } from "@/lib/goals";
import type { SavingsGoal } from "@/types/ai";

export function useGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGoals(loadGoals());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveGoals(goals);
  }, [goals, loaded]);

  const addGoal = useCallback((label: string, target: number, currency: SavingsGoal["currency"]) => {
    setGoals((current) => [createGoal(label, target, currency), ...current]);
  }, []);

  const addGoalObject = useCallback((goal: SavingsGoal) => {
    setGoals((current) => [goal, ...current.filter((item) => item.id !== goal.id)]);
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((current) => current.filter((goal) => goal.id !== id));
  }, []);

  return { goals, loaded, addGoal, addGoalObject, removeGoal, setGoals };
}
