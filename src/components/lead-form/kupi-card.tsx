"use client";

import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { CARD_HEIGHT, CARD_WIDTH, drawKupiCard } from "@/lib/kupi-card";

/** Kupi's official card, rendered to an image the visitor can download. */
export function KupiCard({ name }: { name?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement("canvas");
    drawKupiCard(canvas, { name })
      .then(() => {
        if (!cancelled) setUrl(canvas.toDataURL("image/png"));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (failed) return null;

  const fileName = `kupi-card${name ? `-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : ""}.png`;

  return (
    <figure className="flex w-full flex-col items-center gap-3">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-[0_18px_40px_-18px_rgb(22_22_58/0.55)] ring-1 ring-night/10"
        style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL, not an asset
          <img
            src={url}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            alt={`Kupi official card — ${site.contact.email}, ${site.contact.phoneLabelIntl}, ${site.mainUrlLabel}`}
            className="h-full w-full animate-pop"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-night/90" aria-label="Preparing your Kupi card" />
        )}
      </div>
      <figcaption className="sr-only">Kupi&apos;s official contact card</figcaption>
      {url ? (
        <a
          href={url}
          download={fileName}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-flame px-5 text-sm font-bold text-night shadow-[0_3px_0_0_var(--color-ember)] transition hover:-translate-y-px active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-night/30"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-current">
            <path d="M9 3h2v8.6l3.3-3.3 1.4 1.4L10 15.4 4.3 9.7l1.4-1.4L9 11.6V3ZM4 16h12v2H4v-2Z" />
          </svg>
          Download Kupi card
        </a>
      ) : null}
    </figure>
  );
}
