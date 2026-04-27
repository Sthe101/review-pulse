export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--tx)", margin: 0 }}>
        Dashboard
      </h1>
      <p style={{ color: "var(--tx2)", marginTop: 8 }}>Welcome back.</p>
    </div>
  );
}
