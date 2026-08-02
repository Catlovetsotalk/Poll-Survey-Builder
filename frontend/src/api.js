import axios from "axios";
import * as signalR from "@microsoft/signalr";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // REQUIRED — backend identifies voter/creator via cookies, no login
});

// --- Poll service — matches API.md exactly ---
export const createPoll = (question, options, expiresAt = null) =>
  api.post("/polls", { question, options, expiresAt });

export const getPoll = (code) => api.get(`/polls/${code}`);

export const votePoll = (code, optionIndex) =>
  api.post(`/polls/${code}/vote`, { optionIndex });

export const getResults = (code) => api.get(`/polls/${code}/results`);

export const closePoll = (code) => api.post(`/polls/${code}/close`);

// --- "Am I the creator?" — cosmetic only (real permission is the
// creator_token_{code} cookie the server checks on /close). This just
// decides whether to show the Close button in the UI.
export function markAsCreator(code) {
  const mine = JSON.parse(localStorage.getItem("myPolls") || "[]");
  if (!mine.includes(code)) {
    mine.push(code);
    localStorage.setItem("myPolls", JSON.stringify(mine));
  }
}

export function isCreator(code) {
  const mine = JSON.parse(localStorage.getItem("myPolls") || "[]");
  return mine.includes(code);
}

// --- SignalR — live results push ---
export function connectToPollHub(pollCode, onResultsUpdated) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(import.meta.env.VITE_HUB_URL, { withCredentials: true })
    .withAutomaticReconnect()
    .build();

  connection.on("resultsUpdated", onResultsUpdated);

  connection.start().then(() => {
    connection.invoke("JoinPollGroup", pollCode);
  });

  return connection; // caller stores this to invoke LeavePollGroup + stop() on unmount
}

export default api;
