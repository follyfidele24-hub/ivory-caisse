export interface Currency {
  code: string;
  symbol: string;
  label: string;
  locale: string;
  decimals: number;
  /** true = "1 000 F" (suffixe) · false = "$1 000" (préfixe) */
  suffix: boolean;
  region: string;
}

/** Les devises majeures d'Afrique + internationales */
export const CURRENCIES: Currency[] = [
  { code: "XOF", symbol: "F", label: "Franc CFA (BCEAO)", locale: "fr-FR", decimals: 0, suffix: true, region: "Afrique de l'Ouest" },
  { code: "XAF", symbol: "F", label: "Franc CFA (BEAC)", locale: "fr-FR", decimals: 0, suffix: true, region: "Afrique Centrale" },
  { code: "NGN", symbol: "\u20A6", label: "Naira", locale: "en-NG", decimals: 0, suffix: false, region: "Nigeria" },
  { code: "GHS", symbol: "\u20B5", label: "Cedi", locale: "en-GH", decimals: 2, suffix: false, region: "Ghana" },
  { code: "KES", symbol: "KSh", label: "Shilling kényan", locale: "en-KE", decimals: 0, suffix: false, region: "Kenya" },
  { code: "TZS", symbol: "TSh", label: "Shilling tanzanien", locale: "en-TZ", decimals: 0, suffix: false, region: "Tanzanie" },
  { code: "UGX", symbol: "USh", label: "Shilling ougandais", locale: "en-UG", decimals: 0, suffix: false, region: "Ouganda" },
  { code: "RWF", symbol: "RF", label: "Franc rwandais", locale: "rw-RW", decimals: 0, suffix: true, region: "Rwanda" },
  { code: "ETB", symbol: "Br", label: "Birr", locale: "am-ET", decimals: 2, suffix: true, region: "Éthiopie" },
  { code: "ZAR", symbol: "R", label: "Rand", locale: "en-ZA", decimals: 2, suffix: true, region: "Afrique du Sud" },
  { code: "MAD", symbol: "DH", label: "Dirham", locale: "fr-MA", decimals: 2, suffix: true, region: "Maroc" },
  { code: "DZD", symbol: "DA", label: "Dinar algérien", locale: "ar-DZ", decimals: 2, suffix: true, region: "Algérie" },
  { code: "TND", symbol: "DT", label: "Dinar tunisien", locale: "ar-TN", decimals: 2, suffix: true, region: "Tunisie" },
  { code: "EGP", symbol: "E\u00A3", label: "Livre égyptienne", locale: "ar-EG", decimals: 2, suffix: true, region: "Égypte" },
  { code: "SLL", symbol: "Le", label: "Leone", locale: "en-SL", decimals: 0, suffix: true, region: "Sierra Leone" },
  { code: "GMD", symbol: "D", label: "Dalasi", locale: "en-GM", decimals: 2, suffix: true, region: "Gambie" },
  { code: "USD", symbol: "$", label: "Dollar US", locale: "en-US", decimals: 2, suffix: false, region: "International" },
  { code: "EUR", symbol: "\u20AC", label: "Euro", locale: "fr-FR", decimals: 2, suffix: true, region: "International" },
  { code: "GBP", symbol: "\u00A3", label: "Livre sterling", locale: "en-GB", decimals: 2, suffix: false, region: "International" },
];

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]));
let current = CURRENCIES[0];

export function setCurrency(code?: string): void {
  if (code && byCode.has(code)) current = byCode.get(code)!;
}
export function getCurrency(): Currency {
  return current;
}
export function currencyByCode(code?: string): Currency {
  return (code && byCode.get(code)) || current;
}
