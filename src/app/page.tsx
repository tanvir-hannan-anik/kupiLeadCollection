import Image from "next/image";
import { LeadForm } from "@/components/lead-form/lead-form";
import { site } from "@/config/site";

const promises = [
  { title: "Quick reply", body: "We get back within one working day." },
  { title: "No spam, ever", body: "We only contact you about your enquiry." },
  { title: "Private by design", body: "Your details are never sold or shared." },
];

export default function Home() {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] max-sm:bg-white lg:h-dvh lg:grid-rows-none lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:overflow-hidden">
      {/* Brand panel */}
      <aside className="relative flex flex-col overflow-hidden bg-night px-4 pt-3 pb-8 text-paper sm:px-8 sm:pt-5 sm:pb-10 lg:px-12 lg:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] rounded-full bg-flame/10 blur-3xl"
        />
        <header className="relative flex items-center justify-between gap-3">
          <a
            href={site.mainUrl}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
          >
            <Image
              src="/brand/logo-on-dark.jpg"
              alt="Kupi — home"
              width={1278}
              height={516}
              priority
              className="h-8 w-auto sm:h-10 lg:h-12"
            />
          </a>
          <a
            href={site.mainUrl}
            className="inline-flex items-center gap-1 rounded-full border border-panel-line px-2.5 py-1 font-mono text-[11px] text-paper/80 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs transition hover:border-flame hover:text-flame focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
          >
            {site.mainUrlLabel}
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3 fill-current sm:size-3.5">
              <path d="M7 3h10v10h-2V6.4l-9.3 9.3-1.4-1.4L13.6 5H7V3Z" />
            </svg>
          </a>
        </header>

        <div className="relative mt-3 sm:mt-6 lg:mt-auto">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-flame sm:text-xs">যোগাযোগ · Contact</p>
          <h1 className="mt-1 font-display text-[2rem] leading-[1.05] font-extrabold sm:mt-2 sm:text-5xl xl:text-6xl">
            Let&apos;s Get in <span className="text-flame">Touch</span>
          </h1>
          <p className="mt-1.5 max-w-md text-sm leading-snug text-paper/75 sm:mt-3 sm:text-base sm:leading-normal lg:text-lg">
            Interested in our services? Fill out the form below, and our team will get back to you.
          </p>

          <ul className="mt-7 hidden max-w-md gap-3 lg:grid">
            {promises.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-flame/15 text-flame">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 fill-current">
                    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
                  </svg>
                </span>
                <span className="text-sm">
                  <strong className="font-semibold text-paper">{p.title}</strong>{" "}
                  <span className="text-paper/65">— {p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-auto hidden items-end gap-3 pt-6 lg:flex">
          <Image
            src="/brand/shikha-hello.png"
            alt="Shikha, Kupi's flame mascot, waving hello"
            width={753}
            height={1017}
            className="h-28 w-auto origin-bottom animate-flicker xl:h-32"
          />
          <p className="mb-6 rounded-2xl rounded-bl-sm bg-panel px-4 py-2.5 text-sm text-paper/85">
            হ্যালো! We&apos;d love to hear from you.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <section
        aria-labelledby="form-title"
        className="khata relative -mt-5 flex items-start justify-center rounded-t-3xl max-sm:bg-white max-sm:bg-none sm:-mt-6 sm:px-8 sm:py-6 lg:mt-0 lg:items-center lg:overflow-y-auto lg:rounded-none lg:py-4"
      >
        <div className="w-full max-w-2xl px-4 pt-5 pb-4 sm:rounded-[1.75rem] sm:border sm:border-paper-edge sm:bg-white/95 sm:p-7 sm:shadow-[0_24px_60px_-30px_rgb(22_22_58/0.35)] sm:backdrop-blur lg:px-7 lg:py-5">
          <h2 id="form-title" className="sr-only font-display text-2xl font-bold text-night sm:not-sr-only">
            Tell us about yourself
          </h2>
          <div className="sm:mt-3">
            <LeadForm />
          </div>
        </div>
      </section>
    </main>
  );
}
