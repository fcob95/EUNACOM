import { ImageResponse } from "next/og";
import { appIconMarkup } from "@/lib/appIcon";

export async function GET() {
  return new ImageResponse(appIconMarkup(192), { width: 192, height: 192 });
}
