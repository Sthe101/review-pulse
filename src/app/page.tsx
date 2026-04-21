export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <svg
        width="96"
        height="96"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ReviewPulse logo"
      >
        <rect x="4" y="18" width="5" height="10" rx="1.5" fill="#0D9488" />
        <rect x="13" y="12" width="5" height="16" rx="1.5" fill="#1E3A5F" />
        <rect x="22" y="14" width="5" height="14" rx="1.5" fill="#0D9488" />
        <path
          d="M2 16Q8 8 16 12Q24 6 30 10"
          stroke="#EA580C"
          strokeWidth="2.5"
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
