// reCAPTCHA v3 client helper. Site key is public per Google's design.
export const RECAPTCHA_SITE_KEY = "6Lf3KjotAAAAACgFaEB34tHf3RS34PZbobLegHHP";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

export async function getRecaptchaToken(action: string): Promise<string> {
  if (typeof window === "undefined") throw new Error("recaptcha:no-window");
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error("recaptcha:not-loaded");
  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
}