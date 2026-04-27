/* Shared data model across variants. Global (window-attached) so
   Babel script files can see each other.

   Brands: E = "Edeka-like", H = "Harry-like", A = "Aryzta-like",
   O = "eigene" (own). Colors / letters are abstract badges, not
   real brand marks.
*/

const CATEGORIES = [
  { id: "croissant",  name: "Croissant",    manual: 4,  calc: 3 },
  { id: "baguette",   name: "Baguette",     manual: 8,  calc: 24 },
  { id: "suesses",    name: "Süßes",        manual: 22, calc: 4 },
  { id: "laugen",     name: "Laugengebäck", manual: 7,  calc: 2 },
  { id: "brot",       name: "Brot",         manual: 11, calc: 18 },
  { id: "broetchen",  name: "Brötchen",     manual: 13, calc: 6 },
  { id: "snacks",     name: "Snacks",       manual: 2,  calc: 5 },
  { id: "keine",      name: "keine Gruppe", manual: 9,  calc: 2 },
];

/* Products — 'origin' = 'manual' or 'rule';
   'rule' items have a ruleId explaining why they're filtered. */
const PRODUCTS = [
  // Baguette — rule-filtered (matches screenshot)
  { id: 1,  plu: "81729", name: "Baguette",                    brand: "E", cat: "baguette",  origin: "rule",   ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert; in der Hauptliste erscheint die…", by: "System" },
  { id: 2,  plu: "81968", name: "Ciabatta",                    brand: "E", cat: "baguette",  origin: "rule",   ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert; in der Hauptliste erscheint die…", by: "System" },
  { id: 3,  plu: "88860", name: "Ciabatta mit Schinken und Röstzwiebeln", brand: "A", cat: "baguette", origin: "rule", ruleId: "rule-cat-baguette", hint: "Durch Regel ausgefiltert; in der Hauptliste erscheint die…", by: "System" },
  { id: 4,  plu: "83040", name: "Flammkuchen Baguette",        brand: "A", cat: "baguette",  origin: "rule",   ruleId: "rule-cat-baguette", hint: "Durch Regel ausgefiltert; in der Hauptliste erscheint die…", by: "System" },
  { id: 5,  plu: "83041", name: "Stangenweißbrot rustikal",    brand: "E", cat: "baguette",  origin: "rule",   ruleId: "rule-brand-e", hint: "Master-Zeile aus Version nicht in Backshop", by: "System" },
  // Baguette — manual
  { id: 6,  plu: "80021", name: "Knoblauch-Baguette",          brand: "H", cat: "baguette",  origin: "manual", by: "M. Keller",  since: "2026-04-14" },
  { id: 7,  plu: "80022", name: "Mini-Baguette Classic",       brand: "H", cat: "baguette",  origin: "manual", by: "M. Keller",  since: "2026-04-14" },
  { id: 8,  plu: "80023", name: "Baguette Roggen",             brand: "O", cat: "baguette",  origin: "manual", by: "Admin",       since: "2026-03-28" },

  // Croissant — rule
  { id: 10, plu: "71003", name: "Schoko-Croissant XL",         brand: "E", cat: "croissant", origin: "rule",   ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert; Marke nicht in Sortiment", by: "System" },
  { id: 11, plu: "71004", name: "Mandel-Croissant",            brand: "A", cat: "croissant", origin: "rule",   ruleId: "rule-cat-croissant", hint: "Durch Regel ausgefiltert; in der Hauptliste erscheint die…", by: "System" },
  { id: 12, plu: "71012", name: "Butter-Croissant Premium",    brand: "E", cat: "croissant", origin: "rule",   ruleId: "rule-brand-e", hint: "Master-Zeile aus Version nicht in Backshop", by: "System" },
  // Croissant — manual
  { id: 13, plu: "70001", name: "Croissant",                   brand: "H", cat: "croissant", origin: "manual", by: "M. Keller", since: "2026-04-12" },
  { id: 14, plu: "70002", name: "Mini-Croissant",              brand: "H", cat: "croissant", origin: "manual", by: "Admin",      since: "2026-04-02" },
  { id: 15, plu: "70005", name: "Croissant Käse",              brand: "O", cat: "croissant", origin: "manual", by: "L. Wagner",  since: "2026-03-20" },
  { id: 16, plu: "70008", name: "Nougat-Hörnchen",             brand: "O", cat: "croissant", origin: "manual", by: "L. Wagner",  since: "2026-03-20" },

  // Süßes — manual (the big bucket — 22 in original)
  { id: 20, plu: "60010", name: "Berliner Pfannkuchen",        brand: "H", cat: "suesses", origin: "manual", by: "M. Keller", since: "2026-04-10" },
  { id: 21, plu: "60011", name: "Schoko-Muffin",               brand: "H", cat: "suesses", origin: "manual", by: "M. Keller", since: "2026-04-10" },
  { id: 22, plu: "60012", name: "Apfeltasche",                 brand: "A", cat: "suesses", origin: "manual", by: "Admin",      since: "2026-03-30" },
  { id: 23, plu: "60013", name: "Streuseltaler groß",          brand: "O", cat: "suesses", origin: "manual", by: "L. Wagner",  since: "2026-03-18" },
  { id: 24, plu: "60014", name: "Donut mit Zuckerguss",        brand: "H", cat: "suesses", origin: "manual", by: "L. Wagner",  since: "2026-03-18" },
  // Süßes — rule
  { id: 25, plu: "61003", name: "Amerikaner klassisch",        brand: "E", cat: "suesses", origin: "rule",   ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert; Marke nicht in Sortiment", by: "System" },

  // Brot — mixed
  { id: 30, plu: "50001", name: "Dinkelbrot 750g",             brand: "O", cat: "brot", origin: "manual", by: "Admin", since: "2026-04-02" },
  { id: 31, plu: "50002", name: "Bauernbrot dunkel",           brand: "O", cat: "brot", origin: "manual", by: "Admin", since: "2026-04-02" },
  { id: 32, plu: "50010", name: "Vollkornbrot mit Leinsamen",  brand: "E", cat: "brot", origin: "rule", ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert; Marke nicht in Sortiment", by: "System" },
  { id: 33, plu: "50011", name: "Roggenmischbrot",             brand: "A", cat: "brot", origin: "rule", ruleId: "rule-cat-brot", hint: "Durch Regel ausgefiltert; in der Hauptliste erscheint die…", by: "System" },

  // Brötchen — mixed
  { id: 40, plu: "40001", name: "Kaiserbrötchen",              brand: "H", cat: "broetchen", origin: "manual", by: "M. Keller", since: "2026-04-14" },
  { id: 41, plu: "40002", name: "Mohnbrötchen",                brand: "H", cat: "broetchen", origin: "manual", by: "M. Keller", since: "2026-04-14" },
  { id: 42, plu: "40005", name: "Sesambrötchen",               brand: "O", cat: "broetchen", origin: "manual", by: "Admin",      since: "2026-04-02" },
  { id: 43, plu: "40010", name: "Mehrkornbrötchen",            brand: "E", cat: "broetchen", origin: "rule", ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert", by: "System" },

  // Laugen — mixed
  { id: 50, plu: "30001", name: "Laugenbrezel groß",           brand: "H", cat: "laugen", origin: "manual", by: "M. Keller", since: "2026-04-10" },
  { id: 51, plu: "30002", name: "Laugenstange",                brand: "O", cat: "laugen", origin: "manual", by: "Admin",      since: "2026-04-05" },
  { id: 52, plu: "30010", name: "Laugen-Croissant Butter",     brand: "A", cat: "laugen", origin: "rule", ruleId: "rule-cat-laugen", hint: "Durch Regel ausgefiltert", by: "System" },

  // Snacks — manual
  { id: 60, plu: "20001", name: "Pizzaschnecke Salami",        brand: "A", cat: "snacks", origin: "manual", by: "Admin", since: "2026-04-01" },
  { id: 61, plu: "20002", name: "Käsestange",                  brand: "O", cat: "snacks", origin: "manual", by: "Admin", since: "2026-04-01" },

  // keine Gruppe — manual
  { id: 70, plu: "99001", name: "Saisonartikel Osterzopf",     brand: "O", cat: "keine", origin: "manual", by: "L. Wagner", since: "2026-03-15" },
  { id: 71, plu: "99002", name: "Test-Artikel intern",         brand: "O", cat: "keine", origin: "manual", by: "Admin",      since: "2026-02-20" },
];

const RULES = {
  "rule-brand-e":       { name: "Marke E nicht im Sortiment",       kind: "Marken-Regel",     short: "Marke E", letter: "E" },
  "rule-cat-baguette":  { name: "Gruppenregel Baguette",            kind: "Gruppen-Regel",    short: "Gr. Baguette", letter: "G" },
  "rule-cat-croissant": { name: "Gruppenregel Croissant",           kind: "Gruppen-Regel",    short: "Gr. Croissant", letter: "G" },
  "rule-cat-brot":      { name: "Gruppenregel Brot",                kind: "Gruppen-Regel",    short: "Gr. Brot", letter: "G" },
  "rule-cat-laugen":    { name: "Gruppenregel Laugengebäck",        kind: "Gruppen-Regel",    short: "Gr. Laugen", letter: "G" },
};

const BRAND_LABELS = {
  E: "Edeka", H: "Harry", A: "Aryzta", O: "Eigene",
};

window.HubData = { CATEGORIES, PRODUCTS, RULES, BRAND_LABELS };
