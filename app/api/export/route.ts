import { NextResponse } from "next/server";
import { buildBackupWorkbook } from "@/lib/backup";
import { auth, authConfigured } from "@/auth";

export const dynamic = "force-dynamic";

// Downloads the entire hub as a formatted .xlsx workbook —
// same file the nightly backup emails out.
export async function GET() {
  if (authConfigured) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
  }
  const { buffer, filename } = await buildBackupWorkbook();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
