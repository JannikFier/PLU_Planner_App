/**
 * Seed: Gruppen + ~60 Artikel (groupId null = ohne Zuordnung)
 */
;(function (w) {
  const GROUPS = [
    { id: null, name: 'Ohne Zuordnung', slug: 'none' },
    { id: 'brot', name: 'Brot', slug: 'brot' },
    { id: 'broetchen', name: 'Brötchen', slug: 'broetchen' },
    { id: 'baguette', name: 'Baguette', slug: 'baguette' },
    { id: 'laugen', name: 'Laugengebäck', slug: 'laugen' },
    { id: 'plunder', name: 'Plunder & Teilchen', slug: 'plunder' },
    { id: 'suesses', name: 'Süßes', slug: 'suesses' },
    { id: 'kuchen', name: 'Kuchen', slug: 'kuchen' },
    { id: 'torten', name: 'Torten', slug: 'torten' },
    { id: 'snacks', name: 'Snacks Salzig', slug: 'snacks' },
    { id: 'belegt', name: 'Belegte Brötchen', slug: 'belegt' },
    { id: 'pizza', name: 'Pizza & Flammkuchen', slug: 'pizza' },
    { id: 'saison', name: 'Saisonal', slug: 'saison' },
    { id: 'heiss', name: 'Heißgetränke', slug: 'heiss' },
    { id: 'kalt', name: 'Kaltgetränke', slug: 'kalt' },
  ]

  const ROWS = [
    ['brot', '10014', 'Bauernbrot 1000g'],
    ['brot', '10021', 'Roggenmischbrot 750g'],
    ['brot', '10045', 'Dinkelvollkornbrot'],
    ['brot', '10062', 'Sauerteig-Kruste 500g'],
    ['brot', '10079', 'Walnussbrot'],
    ['broetchen', '11002', 'Sesambrötchen'],
    ['broetchen', '11003', 'Weizenbrötchen'],
    ['broetchen', '11018', 'Mehrkornbrötchen'],
    ['broetchen', '11033', 'Schnittbrötchen hell'],
    ['broetchen', '11041', 'Kaiserbrötchen'],
    ['baguette', '12007', 'Baguette klassisch'],
    ['baguette', '12019', 'Ciabatta'],
    ['baguette', '12024', 'Olivenbaguette'],
    ['laugen', '13011', 'Laugenbrezel'],
    ['laugen', '13028', 'Laugenkranz'],
    ['laugen', '13036', 'Laugenstange groß'],
    ['plunder', '14001', 'Butter-Croissant'],
    ['plunder', '14017', 'Schoko-Croissant'],
    ['plunder', '14029', 'Nussecke'],
    ['plunder', '14044', 'Berliner Marmelade'],
    ['suesses', '14849', 'Zimtschnecke'],
    ['suesses', '14852', 'Apfelstreuseltaler'],
    ['suesses', '14861', 'Donut Schokolade'],
    ['kuchen', '15003', 'Käsekuchen Stück'],
    ['kuchen', '15019', 'Schwarzwälder Stück'],
    ['torten', '16008', 'Sahnetorte klein'],
    ['torten', '16014', 'Obsttorte Stück'],
    ['snacks', '17022', 'Chips Paprika'],
    ['snacks', '17031', 'Studentenfutter'],
    ['belegt', '18005', 'Schinken-Käse-Brötchen'],
    ['belegt', '18012', 'Thunfisch-Brötchen'],
    ['belegt', '18027', 'Camembert-Brötchen'],
    ['pizza', '19001', 'Pizza Margherita Stück'],
    ['pizza', '19014', 'Flammkuchen klassisch'],
    ['saison', '20003', 'Kürbiskernbrot'],
    ['saison', '20011', 'Osterpinze'],
    ['heiss', '21002', 'Kaffee klein'],
    ['heiss', '21015', 'Cappuccino'],
    ['kalt', '22008', 'Apfelschorle 0,5l'],
    ['kalt', '22019', 'Wasser still 0,5l'],
    [null, '23001', 'Neu eingetroffen (Sortierung offen)'],
    [null, '23002', 'Testartikel Backware'],
    [null, '23003', 'Quartalsweise Sonderposition'],
    ['brot', '10088', 'Roggen 100%'],
    ['broetchen', '11066', 'Sonnenblumenkernbrötchen'],
    ['baguette', '12031', 'Kräuterbaguette'],
    ['laugen', '13045', 'Käse-Laugenbreze'],
    ['plunder', '14051', 'Apfelplunder'],
    ['suesses', '14870', 'Muffin Blaubeere'],
    ['kuchen', '15027', 'Bienenstich Stück'],
    ['torten', '16022', 'Hochzeitstorte Probe'],
    ['snacks', '17040', 'Salzstangen'],
    ['belegt', '18033', 'Veggie-Brötchen'],
    ['pizza', '19022', 'Pizza Salami Stück'],
    ['saison', '20019', 'Glühwein-Brötchen'],
    ['heiss', '21022', 'Latte macchiato'],
    ['kalt', '22027', 'Orangensaft 0,33l'],
    ['brot', '10091', 'Krustenbrot 500g'],
    ['broetchen', '11072', 'Dinkelbrötchen'],
    ['suesses', '14875', 'Berliner Vanille'],
    ['kuchen', '15031', 'Mohnkuchen Stück'],
    ['snacks', '17048', 'Erdnüsse geröstet'],
    ['kalt', '22031', 'Cola 0,33l'],
    ['brot', '10095', 'Mischbrot 750g'],
    ['broetchen', '11080', 'Roggenbrötchen'],
  ]

  const items = ROWS.map(([groupId, plu, name]) => ({
    id: 'i-' + plu,
    plu,
    name,
    groupId,
  }))

  const ohneGroup = GROUPS.find((g) => g.id == null)
  const restSorted = GROUPS.filter((g) => g.id != null).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'de'),
  )
  const groupsExport = ohneGroup ? [ohneGroup, ...restSorted] : restSorted

  const payload = { groups: groupsExport, items }
  w.WG_DATA = payload
  w.WGPROT_DATA = payload
})(window)
