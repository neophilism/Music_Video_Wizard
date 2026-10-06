import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Music Video Wizard</p>
        <h1>Direct the video. Let the system compile the edit.</h1>
        <p className="lede">
          A production application for turning an approved creative specification
          into generated shots and a complete first cut over finished music.
        </p>
        <div className="heroActions">
          <Link className="primaryButton linkButton" href="/sign-up">
            Create account
          </Link>
          <Link className="secondaryButton linkButton" href="/sign-in">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
