export type SearchResultKind =
  | "patient"
  | "doctor"
  | "appointment"
  | "bill"
  | "ward"
  | "room"
  | "bed"
  | "staffAccess";

export type GlobalSearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  exactMatch: boolean;
};

export type GlobalSearchSection = {
  kind: SearchResultKind;
  label: string;
  results: GlobalSearchResult[];
};

export type GlobalSearchResponse = {
  query: string;
  total: number;
  exactMatches: GlobalSearchResult[];
  sections: GlobalSearchSection[];
};

export type BarcodeLookupResponse = {
  code: string;
  total: number;
  redirectHref: string | null;
  matches: GlobalSearchResult[];
};
