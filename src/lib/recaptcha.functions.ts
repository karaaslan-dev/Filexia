import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  token: z.string().min(10).max(4000),
  action: z.string().min(1).max(64),
});

/**
 * Verifies a reCAPTCHA v3 token against Google's siteverify endpoint.
 * Returns { ok: true } when score >= 0.5 and action matches.
 */
export const verifyRecaptcha = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      console.error("RECAPTCHA_SECRET_KEY missing");
      return { ok: false as const, reason: "config" };
    }
    const body = new URLSearchParams({ secret, response: data.token });
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false as const, reason: "network" };
    const json = (await res.json()) as {
      success: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };
    if (!json.success) return { ok: false as const, reason: "invalid", errors: json["error-codes"] };
    if (json.action && json.action !== data.action) return { ok: false as const, reason: "action" };
    if (typeof json.score === "number" && json.score < 0.5) {
      return { ok: false as const, reason: "low-score", score: json.score };
    }
    return { ok: true as const, score: json.score };
  });