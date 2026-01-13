import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  // Check for basic auth
  if (authHeader) {
    const basicAuth = authHeader.split(" ")[1];
    if (basicAuth) {
      const [_user, pass] = Buffer.from(basicAuth, "base64")
        .toString()
        .split(":");

      // Check password (user can be anything, we only check password)
      if (pass === process.env.APP_PASSWORD) {
        return NextResponse.next();
      }
    }
  }

  // Not authenticated, return 401
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Loft Visualizer"',
    },
  });
}

export const config = {
  matcher: "/:path*",
};
