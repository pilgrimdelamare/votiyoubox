import React, { useEffect, useState } from "react";

// Map che tiene traccia delle presentazioni viste per ogni concorrente (in-memory, per sessione)
const presentationCount = {};

// Funzione per identificare l'utente (puoi migliorare con login o cookie)
function getUserId() {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = "user-" + Math.random().toString(36).slice(2,10);
    localStorage.setItem("userId", id);
  }
  return id;
}

// Recupera il tavolo, se è previsto nella tua UX (se non usato, puoi rimuovere ovunque)
function getTable() {
  return localStorage.getItem("table") || undefined;
}

export default function VotingScreen() {
  const [scene, setScene] = useState(null);
  const [contestant, setContestant] = useState(null);
  const [song, setSong] = useState(null);
  const [options, setOptions] = useState([]);
  const [drawn, setDrawn] = useState(null); // canzone estratta (nome)
  const [guess, setGuess] = useState(null); // canzone scelta dall'utente
  const [hasGuessed, setHasGuessed] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Polling ogni secondo dello stato dal backend
  useEffect(() => {
    let isMounted = true;
    async function fetchCurrent() {
      try {
        const res = await fetch("/api/current", { headers: { "Cache-Control": "no-cache" } });
        const data = await res.json();
        if (!isMounted) return;

        setScene(data.scene);
        setContestant(data.contestant);
        setSong(data.song);
        setOptions(data.options || []);
        setDrawn(data.drawn || null);

        // Reset guess/voto se cambia la scena
        if (data.scene && data.scene.name !== scene?.name) {
          setGuess(null);
          setHasGuessed(false);
          setHasVoted(false);
        }
      } catch (e) {}
    }
    fetchCurrent();
    const interval = setInterval(fetchCurrent, 1000);
    return () => { isMounted = false; clearInterval(interval); };
    // eslint-disable-next-line
  }, [scene?.name]);

  // === SCENE: START ===
  if (scene?.name === "start") {
    return (
      <div className="screen start">
        <h2>Iscrivi il tuo tavolo a <b>YOUBOX</b> per vincere premi del locale!</h2>
        <p>Chiedi al personale come partecipare.</p>
      </div>
    );
  }

  // === SCENE: PRESENTAZIONE ===
  if (scene?.name === "presentazione" && contestant) {
    // Conta quante volte ogni concorrente è stato presentato (solo lato client)
    const key = contestant.id || contestant.name;
    if (!presentationCount[key]) presentationCount[key] = 0;
    presentationCount[key]++;
    return (
      <div className="screen presentazione">
        <h2>Presentazione di <b>{contestant.name}</b></h2>
        {presentationCount[key] === 1
          ? <FanButton contestant={contestant} />
          : <TeamButton contestant={contestant} />}
      </div>
    );
  }

  // === SCENE: ESTRAZIONE ===
  if (scene?.name === "estrazione" && options.length > 0 && drawn) {
    return (
      <div className="screen estrazione">
        <h2>Quale canzone sarà estratta?</h2>
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          {options.map(opt =>
            <button
              key={opt}
              onClick={() => setGuess(opt)}
              disabled={hasGuessed}
              style={{
                fontWeight: drawn === opt ? "bold" : "normal",
                background: guess === opt ? "#bdf" : "#fff",
                border: drawn === opt ? "2px solid #0a5" : "1px solid #888",
                padding: "0.5em",
                fontSize: "1.1em",
                cursor: hasGuessed ? "not-allowed" : "pointer"
              }}
            >
              {opt}
              {drawn === opt && " 🎯"}
            </button>
          )}
        </div>
        <br/>
        {!hasGuessed && <button onClick={async () => {
          // Chiamata API scommessa
          await fetch("/api/bet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: getUserId(),
              table: getTable(),
              round: scene?.data?.round || 1, // Assicurati che il backend si aspetti "round"
              song: guess,
              correct: guess === drawn
            })
          });
          setHasGuessed(true);
        }} disabled={!guess}>Conferma scelta</button>}
      </div>
    );
  }

  // === SCENE: TITOLO ===
  if (scene?.name === "titolo" && drawn) {
    return (
      <div className="screen titolo">
        <h2>La canzone estratta è:</h2>
        <p style={{fontSize:"1.3em"}}><b>{drawn}</b></p>
        {guess
          ? guess === drawn
            ? <p style={{color:"#0a5"}}>Complimenti, hai indovinato! 🎉</p>
            : <p style={{color:"#d22"}}>Peccato, non era quella giusta!</p>
          : <p>Non hai effettuato una scelta.</p>
        }
      </div>
    );
  }

  // === SCENE: ESIBIZIONE ===
  if (scene?.name === "esibizione" && contestant) {
    return (
      <div className="screen esibizione">
        <h2>{contestant.name} è sul palco!</h2>
        <p>Reagisci all'esibizione:</p>
        <EmojiButtons contestant={contestant} />
      </div>
    );
  }

  // === SCENE: VOTAZIONE ===
  if (scene?.name === "votazione" && contestant) {
    return (
      <div className="screen votazione">
        <h2>Vota {contestant.name}!</h2>
        <VoteStars contestant={contestant} hasVoted={hasVoted} setHasVoted={setHasVoted}/>
      </div>
    );
  }

  // === SCENE: VALUTAZIONE / PUNTEGGIO ===
  if (scene?.name === "valutazione" || scene?.name === "punteggio") {
    return (
      <div className="screen social">
        <h2>Seguici su <b>YOUBOX</b> sui social!</h2>
        <p>
          <a href="https://www.instagram.com/youboxmusic" target="_blank" rel="noopener noreferrer">@youboxmusic</a>
        </p>
      </div>
    );
  }

  // Fallback generico
  return (
    <div className="screen standby">
      <h2>In attesa della prossima azione...</h2>
      <pre style={{fontSize:"0.8em", background:"#eee", padding:"0.5em"}}>{JSON.stringify({scene, contestant, song, options, drawn}, null, 2)}</pre>
    </div>
  );
}


// --- COMPONENTI DI SUPPORTO ---

// Pulsante "diventa fan"
function FanButton({ contestant }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const handleClick = async () => {
    setError(null);
    try {
      const resp = await fetch("/api/fan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          table: getTable(),
          contestant: contestant.name
        })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || "Errore");
      } else {
        setDone(true);
      }
    } catch (e) {
      setError("Errore di rete");
    }
  };
  if (done) return <div>Hai dichiarato il tifo per {contestant.name}!</div>;
  return (
    <div>
      <button onClick={handleClick}>Diventa fan</button>
      {error && <div style={{color:"red", fontSize:"0.9em"}}>{error}</div>}
    </div>
  );
}

// Pulsante "iscriviti al team"
function TeamButton({ contestant }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const handleClick = async () => {
    setError(null);
    try {
      const resp = await fetch("/api/teamfinalist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          table: getTable(),
          team: contestant.name
        })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || "Errore");
      } else {
        setDone(true);
      }
    } catch (e) {
      setError("Errore di rete");
    }
  };
  if (done) return <div>Sei iscritto al team di {contestant.name}!</div>;
  return (
    <div>
      <button onClick={handleClick}>Iscriviti al team</button>
      {error && <div style={{color:"red", fontSize:"0.9em"}}>{error}</div>}
    </div>
  );
}

// Stelle per votare
function VoteStars({ contestant, hasVoted, setHasVoted }) {
  const [stars, setStars] = useState(0);
  const [error, setError] = useState(null);
  const handleVote = async (vote) => {
    setError(null);
    try {
      const resp = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          table: getTable(),
          performance: contestant.name,
          vote
        })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || "Errore");
      } else {
        setStars(vote);
        setHasVoted(true);
      }
    } catch (e) {
      setError("Errore di rete");
    }
  };
  if (hasVoted) return <div>Grazie per il tuo voto!</div>;
  return (
    <div>
      {[1,2,3,4,5].map(n =>
        <span
          key={n}
          style={{fontSize: 36, cursor: "pointer", color: n <= stars ? "#ff0" : "#888"}}
          onClick={() => handleVote(n)}
          role="img"
          aria-label={`${n} stelle`}
        >★</span>
      )}
      {error && <div style={{color:"red", fontSize:"0.9em"}}>{error}</div>}
    </div>
  );
}

// Pulsanti emoji (cuore, pomodoro)
function EmojiButtons({ contestant }) {
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const handleReact = async (type) => {
    setError(null);
    try {
      const resp = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(),
          table: getTable(),
          performance: contestant.name,
          type
        })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || "Errore");
      } else {
        setSent(type);
        setTimeout(() => setSent(null), 1500);
      }
    } catch (e) {
      setError("Errore di rete");
    }
  };
  return (
    <div>
      <button onClick={() => handleReact("cuore")} disabled={sent}>❤️</button>
      <button onClick={() => handleReact("pomodoro")} disabled={sent}>🍅</button>
      {sent && <div>Reaction inviata!</div>}
      {error && <div style={{color:"red", fontSize:"0.9em"}}>{error}</div>}
    </div>
  );
}