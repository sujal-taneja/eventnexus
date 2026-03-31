/**
 * Server-side validation for the simple math CAPTCHA used on public forms.
 * Client sends operands + op + user answer; no secrets — paired with strict rate limits.
 */
export interface MathCaptchaPayload {
  captchaA?: unknown;
  captchaB?: unknown;
  captchaOp?: unknown;
  captchaAnswer?: unknown;
}

const MAX_OPERAND = 20;

export function verifyMathCaptcha(body: MathCaptchaPayload): boolean {
  const a = Number(body.captchaA);
  const b = Number(body.captchaB);
  const answer = Number(body.captchaAnswer);
  const op = body.captchaOp;

  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    !Number.isInteger(answer) ||
    a < 1 ||
    a > MAX_OPERAND ||
    b < 1 ||
    b > MAX_OPERAND
  ) {
    return false;
  }

  if (op === "mul") return a * b === answer;
  if (op === "add") return a + b === answer;
  return false;
}
