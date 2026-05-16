import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";

export async function POST(request: NextRequest) {
  console.log("[UPLOAD] Received, cookies:", [...request.cookies.getAll().map((c: any) => c.name)]);

  try {
    const session = await getServerSession(authOptions);
    console.log("[UPLOAD] Session:", session?.user?.id ?? "NO SESSION");

    if (!session?.user?.id) {
      console.log("[UPLOAD] Rejected: no valid session");
      return NextResponse.json({ error: "Unauthorized - please login again" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("[UPLOAD] File:", (file as File).name, (file as File).type, (file as File).size);

    const bytes = await (file as File).arrayBuffer();
    const buffer = Buffer.from(bytes);

    let ext = ".jpg";
    const fileName = (file as File).name;
    const fileType = (file as File).type;
    if (fileName?.includes(".")) ext = fileName.slice(fileName.lastIndexOf("."));
    else if (fileType) {
      const map: Record<string, string> = {
        "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
        "image/gif": ".gif", "image/svg+xml": ".svg"
      };
      ext = map[fileType] || ".jpg";
    }

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const uploadDir = `${process.cwd()}/public/uploads`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(`${uploadDir}/${name}`, buffer);

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err: any) {
    console.error("[UPLOAD] Error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
