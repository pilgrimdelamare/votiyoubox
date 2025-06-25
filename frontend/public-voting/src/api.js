export const API_BASE = "http://localhost:5174/api";

// Invio voto
export async function sendVote({ userId, performance, vote }) {
  const res = await fetch(`${API_BASE}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, performance, vote }),
  });
  return await res.json();
}

// Invio tifo
export async function sendFan({ userId, contestant }) {
  const res = await fetch(`${API_BASE}/fan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, contestant }),
  });
  return await res.json();
}

// Prendi tutti i voti
export async function getVotes() {
  const res = await fetch(`${API_BASE}/votes`);
  return await res.json();
}

// Prendi tutti i tifo
export async function getFan() {
  const res = await fetch(`${API_BASE}/fan`);
  return await res.json();
}