
import api from "./api";

export interface ActivitySplit {
  kilometer: number;
  duration: number;
  pace: string;
}

export interface ActivityPayload {
  type: "Running" | "Cycling" | "Walking";
  distance: number;
  duration: number;
  pace?: string | null;
  speed?: number | null;
  date: string;
  routePoints?: [number, number][] | null;
  splits?: ActivitySplit[] | null;
}


export interface SavedActivity extends ActivityPayload {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveActivity(data: ActivityPayload) {
  const response = await api.post("/activities", data);
  return response.data.activity as SavedActivity;
}

export async function fetchActivities() {
  const response = await api.get("/activities");
  return response.data.activities as SavedActivity[];
}

export async function fetchActivityById(id: string) {
  const response = await api.get(`/activities/${id}`);
  return response.data.activity as SavedActivity;
}

export async function deleteActivity(id: string) {
  const response = await api.delete(`/activities/${id}`);
  return response.data;
}
