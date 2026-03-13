import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ123456789";
const USER_CODE_LENGTH = 8;
const EXPIRES_IN = 900;
const POLL_INTERVAL = 5;

function generateUserCode(): string {
  const chars: string[] = [];
  const bytes = new Uint8Array(USER_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    chars.push(USER_CODE_ALPHABET[b % USER_CODE_ALPHABET.length]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export async function POST() {
  const deviceCode = randomUUID();
  const userCode = generateUserCode();

  const verificationUri =
    `${process.env.NEXT_PUBLIC_APP_URL ?? "https://knobase.app"}/device`;

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    expires_in: EXPIRES_IN,
    interval: POLL_INTERVAL,
  });
}
