import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import WorkOrders from "./pages/WorkOrders.jsx";

const NAV = [
  { to: "/work-orders", label: "Work orders" },
];

export default function App() {
  return (
    <div className="shell">
      <aside className="shell-nav" aria-label="Main">
        <div className="shell-brand">Ops Desk</div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="shell-link">{item.label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="shell-main">
        <Routes>
          <Route path="/" element={<Navigate to="/work-orders" replace />} />
          <Route path="/work-orders" element={<WorkOrders />} />
        </Routes>
      </main>
    </div>
  );
}
