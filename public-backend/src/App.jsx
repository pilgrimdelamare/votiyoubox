import React, { useState, useEffect } from "react";
import { sendVote, sendFan, getVotes, getFan } from "./api";

export default function App() {
  // --- Stati per i form ---
  const [userId, setUserId] = useState("");
  const [performance, setPerformance] = useState("");
  const [vote, setVote] = useState(5);
  const [contestant, setContestant] = useState("");
  // --- Stato dati ricevuti dal backend ---
  const [votesList, setVotesList] = useState([]);
  const [fanList, setFanList] = useState([]);
  // --- Stato messaggi ---
  const [msg, setMsg] = useState("");

  // Aggiorna le liste ogni 2 secondi (live)
  useEffect(() => {
    const fetchAll = async () => {
      setVotesList(await getVotes());
      setFanList(await getFan());
    };
    fetchAll();
    const timer = setInterval(fetchAll, 2000);
    return () => clearInterval(timer);
  }, []);

  // Invio voto
  async function handleVote(e) {
    e.preventDefault();
    const res = await sendVote({
      userId,
      performance: Number(performance),
      vote: Number(vote),
    });
    setMsg(res.ok ? "Voto inviato!" : res.error || "Errore invio voto");
  }

  // Invio tifo
  async function handleFan(e) {
    e.preventDefault();
    const res = await sendFan({ userId, contestant });
    setMsg(res.ok ? "Tifo inviato!" : res.error || "Errore invio tifo");
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>VOTI YOUBOX - FRONTEND PUBBLICO</h2>
      <div style={{ color: "green", height: 24 }}>{msg}</div>
      <form onSubmit={handleVote} style={{ marginBottom: 16 }}>
        <h3>Invia Voto</h3>
        <input
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          required
        />
        <input
          placeholder="Performance #"
          type="number"
          value={performance}
          onChange={e => setPerformance(e.target.value)}
          required
        />
        <select value={vote} onChange={e => setVote(e.target.value)}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button type="submit">VOTA</button>
      </form>

      <form onSubmit={handleFan} style={{ marginBottom: 16 }}>
        <h3>Invia Tifo</h3>
        <input
          placeholder="User ID"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          required
        />
        <input
          placeholder="Concorrente"
          value={contestant}
          onChange={e => setContestant(e.target.value)}
          required
        />
        <button type="submit">TIFA</button>
      </form>

      <div style={{ display: "flex", gap: 40 }}>
        <div>
          <h4>Lista Voti</h4>
          <ul>
            {votesList.map((v, i) => (
              <li key={i}>
                {v.userId} → Performance {v.performance}: <b>{v.vote}</b>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Lista Tifo</h4>
          <ul>
            {fanList.map((f, i) => (
              <li key={i}>
                {f.userId} → {f.contestant}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}