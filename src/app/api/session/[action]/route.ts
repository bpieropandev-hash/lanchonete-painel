import { NextRequest } from "next/server";
import { handleBrowserSession } from "@/lib/browser-session.server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  return handleBrowserSession(request, action, "funcionario");
}
