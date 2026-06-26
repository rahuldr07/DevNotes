import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function SharedNoteNotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--bg)] px-4 py-12 text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10rem] top-[-14rem] h-96 w-96 rounded-full bg-[var(--accent)]/12 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[var(--main-color)]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          }}
        />
      </div>

      <section className="relative w-full max-w-xl rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              shared note unavailable
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
              This public link is not available.
            </h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          The note may have been unpublished, deleted, or the share link may be
          incorrect. If this is your note, open the editor and publish it again
          to refresh the public page.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Home size={15} />
            go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={15} />
            back to cockpit
          </Link>
        </div>
      </section>
    </main>
  );
}
