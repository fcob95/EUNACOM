import { ImageResponse } from "next/og";
import { appIconMarkup } from "@/lib/appIcon";

export async function GET() {
  return new ImageResponse(appIconMarkup(512), { width: 512, height: 512 });
}
