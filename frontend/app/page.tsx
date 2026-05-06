// import Image from "next/image"; (not used)

export default function Home() {
  return (
    <div className="app-bg min-h-screen w-full flex items-center justify-center font-sans">
      <header className="absolute top-6 left-6 flex items-center gap-3 text-zinc-200">
        <div className="logo-circle" />
        <span className="text-sm font-semibold">Sense AI</span>
      </header>

      <main className="center-card w-full max-w-4xl p-10 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="brand-icon w-20 h-20 rounded-full bg-[#0f1724] flex items-center justify-center">
            <div className="inner-dot w-8 h-8 rounded-full bg-white/90" />
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-zinc-50">
            Hi, Tommy Radison
          </h1>

          <p className="text-zinc-300 max-w-2xl">
            Can I help you with anything?
          </p>

          <p className="text-zinc-400 text-sm max-w-2xl">
           Ready to assist you with anything you need? From answering questions, generation to providing
            recommendations. Let&apos;s get started!
          </p> 
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div className="input-pill w-full max-w-2xl flex items-center gap-4 px-4 py-3">
            <button type="button" aria-label="Open assistant menu" className="icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1Z" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <input className="flex-1 bg-transparent outline-none text-zinc-200 placeholder-zinc-400" placeholder="Ask me anything..." />

            <div className="flex items-center gap-3">
              <button type="button" aria-label="More options" className="icon-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button className="send-btn">Send</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
