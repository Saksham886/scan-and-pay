import { menuRepository } from "@/backend/repositories/menu.repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeSlug: string }> }
) {
  const { cafeSlug } = await params;
  const cafe = await menuRepository.getCafeBySlug(cafeSlug);

  if (!cafe) {
    return new Response("Cafe not found", { status: 404 });
  }

  const manifest = {
    id: `/${cafeSlug}`,
    name: `${cafe.name} - Scan&Pay`,
    short_name: cafe.name,
    description: `Browse the menu and order from ${cafe.name}`,
    start_url: `/${cafeSlug}`,
    scope: `/${cafeSlug}`,
    display: "standalone",
    background_color: "#101415",
    theme_color: "#101415",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
