import type { InterestValue } from "./lead-form";

/**
 * Follow-up email templates — one per "Interested In" option.
 *
 * The admin dashboard pre-fills the email from the template matching the lead's
 * interest; admins can still edit everything before sending.
 *
 * Placeholders (filled in automatically):
 *   {{name}}        visitor's full name
 *   {{interest}}    what they selected, e.g. "Pricing / Quotation"
 *   {{city}}        their city, or "your area" if they left it blank
 *   {{message}}     their original message (blank if none)
 *   {{date}}        the date they contacted us
 *   {{site_url}}    main Kupi website
 *   {{signup_url}}  Kupi sign-up page
 *   {{sender}}      the admin sending the email
 *
 * Lines that end up empty after filling (e.g. a {{message}} line with no
 * message) are removed automatically.
 */
export type FollowUpTemplate = { label: string; subject: string; body: string };

export const FOLLOW_UP_TEMPLATES: Record<InterestValue, FollowUpTemplate> = {
  product_information: {
    label: "Product information",
    subject: "Kupi — your AI teacher for Class 6 to 10",
    body: `Hi {{name}},

Thank you for contacting Kupi on {{date}} about our product. Here's a quick overview:

• Your own AI teacher for every subject from Class 6 to Class 10, following the NCTB curriculum
• Chapter-by-chapter voice lessons in Bangla or English, with a virtual whiteboard
• Practice questions after every lesson, so students learn by understanding, not memorising
• Small live classes with up to 4 classmates
• Works on mobile — and parents can follow their child's progress, with no ads

You wrote: "{{message}}"

You can start for free (no card needed) here: {{signup_url}}

If you'd like a short demo or have any questions, just reply to this email.

Warm regards,
{{sender}}
Kupi Team`,
  },
  service_information: {
    label: "Service information",
    subject: "How Kupi can help — next steps",
    body: `Hi {{name}},

Thanks for reaching out to Kupi on {{date}} — we'd be glad to help.

Kupi gives every student a personal AI teacher that explains each chapter of the national curriculum step by step, answers questions, and adapts to the student's pace. We also run small live classes and give parents a clear view of progress.

You wrote: "{{message}}"

To recommend the right option for you, could you tell us:
1. Which class (6–10) and subjects you're interested in
2. Whether it's for one student, several, or a school/coaching centre
3. A convenient time for a short call

You can also explore Kupi right away: {{site_url}}

Best regards,
{{sender}}
Kupi Team`,
  },
  pricing_quotation: {
    label: "Pricing / quotation",
    subject: "Your Kupi pricing request",
    body: `Hi {{name}},

Thank you for your interest in Kupi pricing (request received on {{date}}).

You can start learning with Kupi for free — no card required — at {{signup_url}}

For a tailored quotation, please reply with:
1. Number of students
2. Class level(s) — 6, 7, 8, 9 or 10
3. Subjects you'd like to cover
4. Any preferred start date

You wrote: "{{message}}"

As soon as we have these details we'll send you a quotation for {{city}}. If it's easier, we can also arrange a quick phone call.

Kind regards,
{{sender}}
Kupi Team`,
  },
  partnership: {
    label: "Partnership",
    subject: "Partnering with Kupi",
    body: `Hi {{name}},

Thank you for your partnership enquiry on {{date}} — we're always happy to work with schools, coaching centres and organisations who share our goal: helping students learn by understanding, not memorising.

You wrote: "{{message}}"

We'd love to learn more about you. Could you share:
1. Your organisation and your role
2. The kind of partnership you have in mind
3. A few times that suit you for a short online meeting

Learn more about Kupi here: {{site_url}}

Looking forward to talking,
{{sender}}
Kupi Team`,
  },
  others: {
    label: "General enquiry",
    subject: "Thanks for contacting Kupi",
    body: `Hi {{name}},

Thank you for getting in touch with Kupi on {{date}}.

You wrote: "{{message}}"

We've read your message and are happy to help. Please reply to this email with any further details, and let us know a good time to reach you if you'd prefer a call.

In the meantime, you can learn more about Kupi here: {{site_url}}

Best wishes,
{{sender}}
Kupi Team`,
  },
};

export const DEFAULT_TEMPLATE: InterestValue = "others";
