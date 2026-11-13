/* Coordonnées officielles — une seule source pour toute l'app */
export const CONTACT = {
  structure: "Ivory Gestion",
  product: "Ivory Caisse",
  founder: "Fidèle Folly",
  email: "ivorygestion@gmail.com",
  whatsapp: "+225 07 59 26 09 53",
  whatsappNum: "2250759260953",
  phones: [
    { label: "+225 07 59 26 09 53", tel: "+2250759260953" },
    { label: "+225 01 42 04 34 07", tel: "+2250142043407" },
  ],
  city: "Cocody, Abidjan — Côte d'Ivoire",
};

export const whatsappLink = (text?: string) =>
  `https://wa.me/${CONTACT.whatsappNum}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
