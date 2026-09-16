import nodemailer from "nodemailer";

/**
 * Sends the magic-link sign-in email. Falls back to logging the link to the
 * server console when SMTP isn't configured, so magic-link auth still works
 * end-to-end in local dev without mail credentials.
 */
export async function sendVerificationRequest(params: {
  identifier: string;
  url: string;
}) {
  const { identifier, url } = params;
  const { EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM } =
    process.env;

  if (!EMAIL_SERVER_HOST) {
    console.log(`\n[Il Mister] Magic link for ${identifier}:\n${url}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: EMAIL_SERVER_HOST,
    port: Number(EMAIL_SERVER_PORT ?? 587),
    secure: Number(EMAIL_SERVER_PORT ?? 587) === 465,
    auth: EMAIL_SERVER_USER
      ? { user: EMAIL_SERVER_USER, pass: EMAIL_SERVER_PASSWORD }
      : undefined,
  });

  await transport.sendMail({
    to: identifier,
    from: EMAIL_FROM ?? "Il Mister <no-reply@ilmister.app>",
    subject: "Il tuo link di accesso a Il Mister",
    text: `Accedi a Il Mister cliccando questo link: ${url}\n\nSe non hai richiesto l'accesso, ignora questa email.`,
    html: `<p>Accedi a <strong>Il Mister</strong> cliccando il link qui sotto:</p><p><a href="${url}">${url}</a></p><p>Se non hai richiesto l'accesso, ignora questa email.</p>`,
  });
}
