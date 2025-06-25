import { useState } from "react";
import UserActionsPage from "./UserActionsPage";
import AdminPage from "./AdminPage";

export default function App() {
  const [role, setRole] = useState("");

  if (!role) {
    return (
      <div style={{ padding: 32 }}>
        <h1>Scegli Ruolo</h1>
        <button onClick={() => setRole("user")}>Utente</button>
        <button onClick={() => setRole("admin")}>Admin</button>
      </div>
    );
  }

  if (role === "user") return <UserActionsPage />;
  if (role === "admin") return <AdminPage />;
}