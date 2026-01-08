import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600" />
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight">AI Playground</span>
              <span className="text-xs text-muted-foreground">
                Multi-LLM prompt arena
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/prompt/new"
              className="rounded-full bg-foreground text-background px-4 py-1.5 font-medium hover:bg-foreground/90 transition"
            >
              New experiment
            </Link>
            <Link
              href="/history"
              className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition"
            >
              History
            </Link>
          </div>
        </div>
      </header>
      <section className="flex-1 container py-10 flex flex-col items-center text-center gap-6">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl">
          Test your prompts across{" "}
          <span className="bg-gradient-to-r from-sky-500 to-violet-600 bg-clip-text text-transparent">
            multiple LLMs
          </span>{" "}
          in real time.
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Run a prompt against GPT, Claude, Gemini, Llama, Mistral and more. Watch
          responses stream in side by side, vote on the best one, and see which
          models win in the arena.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          <Link
            href="/prompt/new"
            className="rounded-lg bg-foreground text-background px-6 py-2.5 font-medium hover:bg-foreground/90 transition shadow-sm"
          >
            Start a prompt run
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-lg border border-border px-6 py-2.5 font-medium hover:bg-accent hover:text-accent-foreground transition"
          >
            View model leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}


