export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ReviewPulse logo"
      >
        <rect x="12" y="28" width="10" height="32" rx="2" fill="#14B8A6" />
        <rect x="31" y="20" width="10" height="40" rx="2" fill="#1E3A8A" />
        <rect x="50" y="28" width="10" height="32" rx="2" fill="#14B8A6" />
        <path
          d="M8 22 Q24 4 36 18 T64 14"
          stroke="#F97066"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <h1 className="mt-6 text-4xl font-bold text-slate-900">ReviewPulse</h1>
      <p className="mt-3 text-base text-slate-600">
        AI-powered customer review analysis. Launching soon.
      </p>
    </main>
  );
}
