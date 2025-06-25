import { useState } from "react";

export default function UserActionsPage() {
  // Stato per ogni azione e risultato
  const [userId, setUserId] = useState("");

  // VOTO
  const [performanceVote, setPerformanceVote] = useState("");
  const [voteResult, setVoteResult] = useState(null);

  // TIFO
  const [contestant, setContestant] = useState("");
  const [fanResult, setFanResult] = useState(null);

  // SCOMMESSA
  const [round, setRound] = useState("");
  const [song, setSong] = useState("");
  const [betResult, setBetResult] = useState(null);

  // REACTION
  const [performanceReaction, setPerformanceReaction] = useState("");
  const [reactionType, setReactionType] = useState("");
  const [reactionResult, setReactionResult] = useState(null);

  // LOGO CLICK
  const [eventLogo, setEventLogo] = useState("");
  const [logoResult, setLogoResult] = useState(null);

  // TEAM FINALIST
  const [team, setTeam] = useState("");
  const [teamResult, setTeamResult] = useState(null);

  // SOCIAL BONUS
  const [bonusType, setBonusType] = useState("");
  const [socialResult, setSocialResult] = useState(null);

  // Funzioni per chiamate API
  async function callApi(path, body, setResult) {
    setResult("Loading...");
    try {
      const resp = await fetch(`http://localhost:4000/api/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult("Errore nella chiamata API");
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h2>Azioni Utente</h2>
      <div>
        <label>ID Utente:{" "}
          <input value={userId} onChange={e => setUserId(e.target.value)} />
        </label>
      </div>
      <hr />

      {/* ---- VOTO ---- */}
      <h3>Vota una Performance</h3>
      <label>Performance:{" "}
        <input value={performanceVote} onChange={e => setPerformanceVote(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("votes", { userId: Number(userId), performance: Number(performanceVote) }, setVoteResult)
      }>Vota</button>
      {voteResult && <pre>{voteResult}</pre>}

      <hr />
      {/* ---- TIFO ---- */}
      <h3>Tifa per un concorrente</h3>
      <label>Concorrente:{" "}
        <input value={contestant} onChange={e => setContestant(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("fan", { userId: Number(userId), contestant }, setFanResult)
      }>Tifa</button>
      {fanResult && <pre>{fanResult}</pre>}

      <hr />
      {/* ---- SCOMMESSA ---- */}
      <h3>Fai una scommessa</h3>
      <label>Round:{" "}
        <input value={round} onChange={e => setRound(e.target.value)} />
      </label>
      <label>Brano:{" "}
        <input value={song} onChange={e => setSong(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("bets", { userId: Number(userId), round: Number(round), song }, setBetResult)
      }>Scommetti</button>
      {betResult && <pre>{betResult}</pre>}

      <hr />
      {/* ---- REACTION ---- */}
      <h3>Invia una Reaction</h3>
      <label>Performance:{" "}
        <input value={performanceReaction} onChange={e => setPerformanceReaction(e.target.value)} />
      </label>
      <label>Tipo ("cuore" o "pomodoro"):{" "}
        <input value={reactionType} onChange={e => setReactionType(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("reactions", { userId: Number(userId), performance: Number(performanceReaction), type: reactionType }, setReactionResult)
      }>Invia Reaction</button>
      {reactionResult && <pre>{reactionResult}</pre>}

      <hr />
      {/* ---- LOGO CLICK ---- */}
      <h3>Click sul Logo</h3>
      <label>Evento Logo (numero):{" "}
        <input value={eventLogo} onChange={e => setEventLogo(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("logo", { userId: Number(userId), event: Number(eventLogo) }, setLogoResult)
      }>Click Logo</button>
      {logoResult && <pre>{logoResult}</pre>}

      <hr />
      {/* ---- TEAM FINALIST ---- */}
      <h3>Scegli Team Finalista</h3>
      <label>Team:{" "}
        <input value={team} onChange={e => setTeam(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("teamfinalist", { userId: Number(userId), team }, setTeamResult)
      }>Invia Team</button>
      {teamResult && <pre>{teamResult}</pre>}

      <hr />
      {/* ---- SOCIAL BONUS ---- */}
      <h3>Invia Social Bonus</h3>
      <label>Tipo Bonus ("follow", "story", ecc.):{" "}
        <input value={bonusType} onChange={e => setBonusType(e.target.value)} />
      </label>
      <button onClick={() =>
        callApi("socialbonus", { userId: Number(userId), type: bonusType }, setSocialResult)
      }>Invia Bonus</button>
      {socialResult && <pre>{socialResult}</pre>}

      <hr />
      <p style={{ color: "#666" }}>Puoi copiare questa pagina e separare ogni sezione in pagine distinte per una migliore UX!</p>
    </div>
  );
}