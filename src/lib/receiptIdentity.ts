import type { Profile } from "./store";

/* Ce qui s'imprime en tête et en pied de reçu.
   Gratuit : nom de la boutique et du gérant, merci standard, mention Ivory Caisse.
   Premium : ville, téléphone et message choisis par le commerçant, sans la mention Ivory Caisse. */
export function receiptIdentity(profile: Profile | null) {
  const premium = !!profile && profile.plan !== "free";
  const r = premium ? profile?.receipt ?? {} : {};
  const sub = [r.city, r.phone ? `Tél. ${r.phone}` : ""].filter(Boolean) as string[];
  return {
    shop: profile?.shop || "Ma boutique",
    lines: sub.length ? sub : [profile?.name ?? ""].filter(Boolean),
    thanks: (premium && r.thanks) || "Merci de votre visite !",
    footer: premium ? null : "Ivory Caisse · Ivory Gestion",
  };
}
