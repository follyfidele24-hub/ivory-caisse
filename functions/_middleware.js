// ESSAI CLOUDFLARE PAGES : le site d'essai ne doit pas être indexé (contenu en double de la prod).
export async function onRequest({ next }) {
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  return out;
}
