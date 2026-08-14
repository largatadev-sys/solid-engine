const { buildTrip } = require('./tripBuilder');

// A hundred published trips whose only job is to give Discovery something to be. They attach to the
// existing ten travelers, six in that traveler's home region and four in an adjacent one, so the
// regional-specialist identity that makes the fixture legible survives while the coverage widens
// into Central Asia, the Pacific, Eastern Europe, the Middle East, Central America, the Caribbean,
// West Africa and the Arctic fringe.
//
// DURATIONS RUN 2,3,3,3,5,6,7,10,12,16 PER TRAVELER, which is not decoration: the filter sheet
// offers 1-3 / 4-7 / 8-14 / 15+, and a dataset capped at seven days leaves half of it returning "no
// results" forever. This ladder fills every band — 40 / 30 / 20 / 10 across the hundred.
//
// DESTINATIONS REPEAT ON PURPOSE. Trending groups by destination string and caps at 12, so a
// hundred trips naming a hundred places yields a ranking of ties. Hubs recur across a traveler's
// trips the way they do in real travel — you keep coming back through the same airport.
//
// ALL COMPLETED AND PUBLIC, because populating Discovery is the whole point. The original fifty
// carry the lifecycle spread and the two private trips that prove the visibility fence; nothing here
// needs to duplicate that.

const t = (owner, title, destinations, currency, bestTimeOfYear, days) => ({
  owner,
  title,
  destinations,
  currency,
  bestTimeOfYear,
  days,
  lifecycle: 'completed',
  publish: 'public',
});


const SPECS = [
  // ─── t1 · Maya Ocampo · Southeast Asia, expanding into Indochina and Borneo ───────────────────
  t('t1', 'Kota Kinabalu, a long weekend', ['Kota Kinabalu'], 'MYR', 'Mar – Sep', [
    'Kota Kinabalu|city', 'Tanjung Aru, Kota Kinabalu|coast',
  ]),
  t('t1', 'Coron, wrecks and lakes', ['Coron', 'Palawan'], 'PHP', 'Nov – May', [
    'Coron Town, Palawan|town', 'Kayangan Lake, Coron|nature', 'Barracuda Lake, Coron|nature',
  ]),
  t('t1', 'Bohol in three days', ['Bohol'], 'PHP', 'Dec – May', [
    'Panglao, Bohol|coast', 'Chocolate Hills, Bohol|nature', 'Loboc River, Bohol|nature',
  ]),
  t('t1', 'Luang Prabang, slowly', ['Luang Prabang'], 'LAK', 'Nov – Feb', [
    'Luang Prabang|heritage', 'Kuang Si Falls, Luang Prabang|nature', 'Luang Prabang|town',
  ]),
  t('t1', 'Siargao, surf and lagoons', ['Siargao'], 'PHP', 'Aug – Nov', [
    'General Luna, Siargao|town', 'Cloud 9, Siargao|coast', 'Sugba Lagoon, Siargao|nature',
    'Magpupungko, Siargao|coast', 'Guyam Island, Siargao|coast',
  ]),
  t('t1', 'Bali, the east coast', ['Bali'], 'IDR', 'Apr – Oct', [
    'Amed, Bali|coast', 'Amed, Bali|coast', 'Sidemen, Bali|nature', 'Mount Batur, Bali|mountain',
    'Ubud, Bali|town', 'Ubud, Bali|town',
  ]),
  t('t1', 'The Ha Giang loop', ['Ha Giang', 'Hanoi'], 'VND', 'Sep – Nov', [
    'Hanoi, Vietnam|city', 'Ha Giang, Vietnam|road', 'Dong Van, Ha Giang|mountain',
    'Meo Vac, Ha Giang|mountain', 'Du Gia, Ha Giang|nature', 'Ha Giang, Vietnam|town',
    'Hanoi, Vietnam|city',
  ]),
  t('t1', 'Java, volcano to volcano', ['Java', 'Yogyakarta'], 'IDR', 'May – Sep', [
    'Yogyakarta, Java|city', 'Borobudur, Java|heritage', 'Prambanan, Java|heritage',
    'Yogyakarta, Java|city', 'Mount Bromo, Java|mountain', 'Probolinggo, Java|road',
    'Ijen Crater, Java|mountain', 'Banyuwangi, Java|town', 'Surabaya, Java|city',
    'Surabaya, Java|city',
  ]),
  t('t1', 'Northern Laos overland', ['Luang Prabang', 'Nong Khiaw'], 'LAK', 'Nov – Mar', [
    'Vientiane, Laos|city', 'Vang Vieng, Laos|nature', 'Vang Vieng, Laos|mountain',
    'Luang Prabang|heritage', 'Luang Prabang|town', 'Nong Khiaw, Laos|mountain',
    'Nong Khiaw, Laos|nature', 'Muang Ngoi, Laos|nature', 'Muang Ngoi, Laos|town',
    'Luang Prabang|road', 'Luang Prabang|city', 'Vientiane, Laos|city',
  ]),
  t('t1', 'Myanmar, Bagan to Inle', ['Bagan', 'Inle Lake'], 'MMK', 'Nov – Feb', [
    'Yangon, Myanmar|city', 'Yangon, Myanmar|city', 'Bagan, Myanmar|heritage',
    'Bagan, Myanmar|heritage', 'Bagan, Myanmar|heritage', 'Mount Popa, Myanmar|mountain',
    'Kalaw, Myanmar|town', 'Kalaw, Myanmar|mountain', 'Inle Lake, Myanmar|nature',
    'Inle Lake, Myanmar|nature', 'Inle Lake, Myanmar|nature', 'Nyaungshwe, Myanmar|town',
    'Mandalay, Myanmar|city', 'Mandalay, Myanmar|heritage', 'Yangon, Myanmar|city',
    'Yangon, Myanmar|city',
  ]),

  // ─── t2 · Kenji Nakamura · East Asia, expanding into Central Asia ─────────────────────────────
  t('t2', 'Kanazawa, two days', ['Kanazawa'], 'JPY', 'Apr – Jun', [
    'Kanazawa, Japan|city', 'Kenrokuen, Kanazawa|nature',
  ]),
  t('t2', 'Busan by the water', ['Busan'], 'KRW', 'Apr – Jun', [
    'Haeundae, Busan|coast', 'Gamcheon, Busan|city', 'Taejongdae, Busan|coast',
  ]),
  t('t2', 'Hakone and back', ['Hakone', 'Tokyo'], 'JPY', 'Oct – Nov', [
    'Tokyo, Japan|city', 'Hakone, Japan|mountain', 'Lake Ashi, Hakone|nature',
  ]),
  t('t2', 'Ulaanbaatar and the steppe', ['Ulaanbaatar'], 'MNT', 'Jun – Sep', [
    'Ulaanbaatar, Mongolia|city', 'Terelj National Park|nature', 'Ulaanbaatar, Mongolia|city',
  ]),
  t('t2', 'Kyoto in the off season', ['Kyoto'], 'JPY', 'Jan – Mar', [
    'Kyoto, Japan|heritage', 'Arashiyama, Kyoto|nature', 'Fushimi, Kyoto|heritage',
    'Kyoto, Japan|city', 'Uji, Kyoto|town',
  ]),
  t('t2', 'Seoul and Jeju', ['Seoul', 'Jeju'], 'KRW', 'Apr – Jun', [
    'Seoul, South Korea|city', 'Bukchon, Seoul|heritage', 'Seoul, South Korea|city',
    'Jeju City, Jeju|town', 'Seongsan Ilchulbong, Jeju|mountain', 'Jeju, South Korea|coast',
  ]),
  t('t2', 'Taiwan, a loop by train', ['Taipei', 'Taiwan'], 'TWD', 'Oct – Dec', [
    'Taipei, Taiwan|city', 'Jiufen, Taiwan|town', 'Hualien, Taiwan|coast',
    'Taroko Gorge, Taiwan|mountain', 'Tainan, Taiwan|heritage', 'Sun Moon Lake, Taiwan|nature',
    'Taipei, Taiwan|city',
  ]),
  t('t2', 'Hokkaido end to end', ['Hokkaido', 'Sapporo'], 'JPY', 'Jun – Sep', [
    'Sapporo, Hokkaido|city', 'Otaru, Hokkaido|town', 'Furano, Hokkaido|nature',
    'Biei, Hokkaido|nature', 'Asahikawa, Hokkaido|city', 'Daisetsuzan, Hokkaido|mountain',
    'Kushiro, Hokkaido|coast', 'Lake Akan, Hokkaido|nature', 'Shiretoko, Hokkaido|coast',
    'Sapporo, Hokkaido|city',
  ]),
  t('t2', 'Uzbekistan, the Silk Road cities', ['Samarkand', 'Bukhara'], 'UZS', 'Apr – May', [
    'Tashkent, Uzbekistan|city', 'Tashkent, Uzbekistan|city', 'Samarkand, Uzbekistan|heritage',
    'Samarkand, Uzbekistan|heritage', 'Samarkand, Uzbekistan|city', 'Bukhara, Uzbekistan|heritage',
    'Bukhara, Uzbekistan|heritage', 'Bukhara, Uzbekistan|town', 'Khiva, Uzbekistan|heritage',
    'Khiva, Uzbekistan|town', 'Nukus, Uzbekistan|road', 'Tashkent, Uzbekistan|city',
  ]),
  t('t2', 'Honshu slowly, south to north', ['Tokyo', 'Kyoto'], 'JPY', 'Mar – May', [
    'Fukuoka, Japan|city', 'Hiroshima, Japan|heritage', 'Miyajima, Japan|coast',
    'Osaka, Japan|city', 'Osaka, Japan|city', 'Kyoto, Japan|heritage', 'Kyoto, Japan|town',
    'Kanazawa, Japan|city', 'Takayama, Japan|town', 'Kamikochi, Japan|mountain',
    'Matsumoto, Japan|town', 'Nikko, Japan|heritage', 'Tokyo, Japan|city', 'Tokyo, Japan|city',
    'Sendai, Japan|city', 'Tokyo, Japan|city',
  ]),

  // ─── t3 · Ruby Ellis · Oceania, expanding into the Pacific Islands ────────────────────────────
  t('t3', 'Byron Bay, a weekend', ['Byron Bay'], 'AUD', 'Sep – Nov', [
    'Byron Bay, NSW|coast', 'Cape Byron, NSW|coast',
  ]),
  t('t3', 'Rotorua and the lakes', ['Rotorua'], 'NZD', 'Dec – Mar', [
    'Rotorua, New Zealand|nature', 'Wai-O-Tapu, Rotorua|nature', 'Lake Tarawera|nature',
  ]),
  t('t3', 'Kangaroo Island', ['Kangaroo Island'], 'AUD', 'Feb – Apr', [
    'Penneshaw, Kangaroo Island|town', 'Flinders Chase, Kangaroo Island|nature',
    'Vivonne Bay, Kangaroo Island|coast',
  ]),
  t('t3', 'Nadi and the Yasawas', ['Fiji'], 'FJD', 'May – Oct', [
    'Nadi, Fiji|town', 'Yasawa Islands, Fiji|coast', 'Yasawa Islands, Fiji|coast',
  ]),
  t('t3', 'The Bay of Islands', ['Bay of Islands'], 'NZD', 'Dec – Mar', [
    'Paihia, New Zealand|town', 'Russell, New Zealand|town', 'Cape Reinga|coast',
    'Bay of Islands|coast', 'Whangarei, New Zealand|nature',
  ]),
  t('t3', 'Vanuatu, Efate and Tanna', ['Vanuatu'], 'VUV', 'Apr – Oct', [
    'Port Vila, Vanuatu|town', 'Efate, Vanuatu|coast', 'Efate, Vanuatu|nature',
    'Tanna, Vanuatu|road', 'Mount Yasur, Tanna|mountain', 'Tanna, Vanuatu|coast',
  ]),
  t('t3', 'Adelaide to the Flinders', ['Flinders Ranges', 'Adelaide'], 'AUD', 'Apr – Oct', [
    'Adelaide, SA|city', 'Barossa Valley, SA|town', 'Clare Valley, SA|nature',
    'Port Augusta, SA|road', 'Wilpena Pound, SA|mountain', 'Flinders Ranges, SA|desert',
    'Adelaide, SA|city',
  ]),
  t('t3', 'The North Island, top to bottom', ['North Island', 'Wellington'], 'NZD', 'Nov – Apr', [
    'Auckland, New Zealand|city', 'Coromandel, New Zealand|coast', 'Rotorua, New Zealand|nature',
    'Taupo, New Zealand|nature', 'Tongariro, New Zealand|mountain', 'Napier, New Zealand|town',
    'Wellington, New Zealand|city', 'Wellington, New Zealand|city', 'Kapiti Coast|coast',
    'Auckland, New Zealand|city',
  ]),
  t('t3', 'Tasmania, the whole island', ['Tasmania', 'Hobart'], 'AUD', 'Dec – Mar', [
    'Hobart, Tasmania|city', 'Mount Wellington, Hobart|mountain', 'Bruny Island, Tasmania|coast',
    'Port Arthur, Tasmania|heritage', 'Freycinet, Tasmania|coast', 'Bay of Fires, Tasmania|coast',
    'Launceston, Tasmania|town', 'Cradle Mountain, Tasmania|mountain',
    'Cradle Mountain, Tasmania|nature', 'Strahan, Tasmania|coast', 'Lake St Clair, Tasmania|nature',
    'Hobart, Tasmania|city',
  ]),
  t('t3', 'The South Island, unhurried', ['South Island', 'Queenstown'], 'NZD', 'Nov – Apr', [
    'Christchurch, New Zealand|city', 'Akaroa, New Zealand|coast', 'Lake Tekapo|nature',
    'Mount Cook, New Zealand|mountain', 'Wanaka, New Zealand|town', 'Wanaka, New Zealand|mountain',
    'Queenstown, New Zealand|town', 'Queenstown, New Zealand|nature',
    'Fiordland, New Zealand|nature', 'Milford Sound, New Zealand|nature',
    'Te Anau, New Zealand|town', 'Invercargill, New Zealand|road', 'Dunedin, New Zealand|city',
    'Moeraki, New Zealand|coast', 'Oamaru, New Zealand|town', 'Christchurch, New Zealand|city',
  ]),

  // ─── t4 · Tomás Ferreira · Western Europe, expanding into Eastern Europe ──────────────────────
  t('t4', 'Bruges in two days', ['Bruges'], 'EUR', 'Apr – Jun', [
    'Bruges, Belgium|heritage', 'Bruges, Belgium|town',
  ]),
  t('t4', 'Kraków, three days', ['Kraków'], 'PLN', 'May – Sep', [
    'Kraków, Poland|heritage', 'Kazimierz, Kraków|city', 'Wieliczka, Kraków|heritage',
  ]),
  t('t4', 'The Algarve, west end', ['Algarve'], 'EUR', 'Apr – Jun', [
    'Lagos, Algarve|coast', 'Sagres, Algarve|coast', 'Costa Vicentina, Algarve|nature',
  ]),
  t('t4', 'Budapest, baths and hills', ['Budapest'], 'HUF', 'Apr – Oct', [
    'Budapest, Hungary|city', 'Buda Hills, Budapest|nature', 'Budapest, Hungary|heritage',
  ]),
  t('t4', 'The Dolomites in autumn', ['Dolomites'], 'EUR', 'Sep – Oct', [
    'Bolzano, Italy|town', 'Val Gardena, Italy|mountain', 'Tre Cime, Italy|mountain',
    'Cortina, Italy|town', 'Lago di Braies, Italy|nature',
  ]),
  t('t4', 'The Baltic capitals', ['Tallinn', 'Riga'], 'EUR', 'Jun – Aug', [
    'Vilnius, Lithuania|heritage', 'Vilnius, Lithuania|city', 'Riga, Latvia|heritage',
    'Riga, Latvia|city', 'Tallinn, Estonia|heritage', 'Tallinn, Estonia|coast',
  ]),
  t('t4', 'Andalusia by train', ['Seville', 'Granada'], 'EUR', 'Mar – May', [
    'Seville, Spain|heritage', 'Seville, Spain|city', 'Córdoba, Spain|heritage',
    'Granada, Spain|heritage', 'Granada, Spain|city', 'Ronda, Spain|town',
    'Málaga, Spain|coast',
  ]),
  t('t4', 'Scotland by the west coast', ['Scottish Highlands', 'Skye'], 'GBP', 'May – Sep', [
    'Edinburgh, Scotland|city', 'Glencoe, Scotland|mountain', 'Fort William, Scotland|town',
    'Isle of Skye, Scotland|coast', 'Isle of Skye, Scotland|mountain', 'Applecross, Scotland|road',
    'Ullapool, Scotland|coast', 'Inverness, Scotland|town', 'Cairngorms, Scotland|mountain',
    'Edinburgh, Scotland|city',
  ]),
  t('t4', 'Portugal end to end, again', ['Lisbon', 'Porto'], 'EUR', 'Apr – Jun', [
    'Lisbon, Portugal|city', 'Sintra, Portugal|heritage', 'Óbidos, Portugal|town',
    'Coimbra, Portugal|heritage', 'Aveiro, Portugal|town', 'Porto, Portugal|city',
    'Porto, Portugal|city', 'Douro Valley, Portugal|nature', 'Peneda-Gerês, Portugal|mountain',
    'Braga, Portugal|heritage', 'Guimarães, Portugal|town', 'Lisbon, Portugal|city',
  ]),
  t('t4', 'Central Europe by rail', ['Prague', 'Vienna'], 'EUR', 'May – Sep', [
    'Berlin, Germany|city', 'Berlin, Germany|city', 'Dresden, Germany|heritage',
    'Prague, Czechia|heritage', 'Prague, Czechia|city', 'Český Krumlov, Czechia|town',
    'Salzburg, Austria|town', 'Hallstatt, Austria|nature', 'Vienna, Austria|city',
    'Vienna, Austria|heritage', 'Bratislava, Slovakia|town', 'Budapest, Hungary|city',
    'Budapest, Hungary|heritage', 'Ljubljana, Slovenia|town', 'Lake Bled, Slovenia|nature',
    'Vienna, Austria|city',
  ]),

  // ─── t5 · Eleni Papadaki · Mediterranean, expanding into the Middle East ──────────────────────
  t('t5', 'Hydra, no cars', ['Hydra'], 'EUR', 'May – Oct', [
    'Hydra, Greece|coast', 'Hydra, Greece|town',
  ]),
  t('t5', 'Matera and the south', ['Matera'], 'EUR', 'Apr – Jun', [
    'Matera, Italy|heritage', 'Matera, Italy|town', 'Alberobello, Italy|town',
  ]),
  t('t5', 'Kotor and the bay', ['Kotor'], 'EUR', 'May – Sep', [
    'Kotor, Montenegro|heritage', 'Perast, Montenegro|coast', 'Lovćen, Montenegro|mountain',
  ]),
  t('t5', 'Petra in three days', ['Petra'], 'JOD', 'Mar – May', [
    'Wadi Musa, Jordan|town', 'Petra, Jordan|heritage', 'Little Petra, Jordan|heritage',
  ]),
  t('t5', 'Crete, the west', ['Crete'], 'EUR', 'May – Jun', [
    'Chania, Crete|town', 'Balos, Crete|coast', 'Samaria Gorge, Crete|mountain',
    'Elafonissi, Crete|coast', 'Rethymno, Crete|heritage',
  ]),
  t('t5', 'Puglia, heel to coast', ['Puglia'], 'EUR', 'May – Jun', [
    'Bari, Italy|city', 'Polignano a Mare, Italy|coast', 'Ostuni, Italy|town',
    'Lecce, Italy|heritage', 'Otranto, Italy|coast', 'Gallipoli, Italy|coast',
  ]),
  t('t5', 'Oman, coast and wadis', ['Oman'], 'OMR', 'Nov – Mar', [
    'Muscat, Oman|city', 'Wadi Shab, Oman|nature', 'Sur, Oman|coast',
    'Wahiba Sands, Oman|desert', 'Nizwa, Oman|heritage', 'Jebel Shams, Oman|mountain',
    'Muscat, Oman|city',
  ]),
  t('t5', 'The Cyclades, five islands', ['Cyclades', 'Naxos'], 'EUR', 'May – Sep', [
    'Athens, Greece|city', 'Naxos, Greece|coast', 'Naxos, Greece|town',
    'Paros, Greece|coast', 'Antiparos, Greece|coast', 'Milos, Greece|coast',
    'Milos, Greece|nature', 'Folegandros, Greece|town', 'Santorini, Greece|coast',
    'Athens, Greece|city',
  ]),
  t('t5', 'Turkey, Aegean to Cappadocia', ['Cappadocia', 'Istanbul'], 'TRY', 'Apr – Jun', [
    'Istanbul, Türkiye|city', 'Istanbul, Türkiye|heritage', 'Izmir, Türkiye|city',
    'Ephesus, Türkiye|heritage', 'Pamukkale, Türkiye|nature', 'Fethiye, Türkiye|coast',
    'Kaş, Türkiye|coast', 'Antalya, Türkiye|town', 'Cappadocia, Türkiye|desert',
    'Göreme, Türkiye|heritage', 'Cappadocia, Türkiye|mountain', 'Istanbul, Türkiye|city',
  ]),
  t('t5', 'Sicily, the full circle', ['Sicily', 'Palermo'], 'EUR', 'Apr – Jun', [
    'Palermo, Sicily|city', 'Palermo, Sicily|heritage', 'Cefalù, Sicily|coast',
    'Aeolian Islands, Sicily|coast', 'Aeolian Islands, Sicily|mountain', 'Taormina, Sicily|town',
    'Mount Etna, Sicily|mountain', 'Catania, Sicily|city', 'Syracuse, Sicily|heritage',
    'Noto, Sicily|town', 'Ragusa, Sicily|town', 'Agrigento, Sicily|heritage',
    'Selinunte, Sicily|heritage', 'Trapani, Sicily|coast', 'Favignana, Sicily|coast',
    'Palermo, Sicily|city',
  ]),

  // ─── t6 · Diego Morales · South America, expanding into Central America ───────────────────────
  t('t6', 'Colonia, across the river', ['Colonia'], 'UYU', 'Oct – Mar', [
    'Colonia del Sacramento, Uruguay|heritage', 'Colonia del Sacramento, Uruguay|town',
  ]),
  t('t6', 'Valparaíso and the coast', ['Valparaíso'], 'CLP', 'Nov – Mar', [
    'Valparaíso, Chile|city', 'Viña del Mar, Chile|coast', 'Isla Negra, Chile|coast',
  ]),
  t('t6', 'Medellín, three days', ['Medellín'], 'COP', 'Dec – Mar', [
    'Medellín, Colombia|city', 'Comuna 13, Medellín|city', 'Guatapé, Colombia|nature',
  ]),
  t('t6', 'Antigua and the volcanoes', ['Antigua'], 'GTQ', 'Nov – Apr', [
    'Antigua, Guatemala|heritage', 'Acatenango, Guatemala|mountain', 'Antigua, Guatemala|town',
  ]),
  t('t6', 'Salta and the north', ['Salta'], 'ARS', 'Apr – Oct', [
    'Salta, Argentina|city', 'Cafayate, Argentina|nature', 'Purmamarca, Argentina|desert',
    'Salinas Grandes, Argentina|desert', 'Salta, Argentina|town',
  ]),
  t('t6', 'Costa Rica, coast to cloud', ['Costa Rica'], 'CRC', 'Dec – Apr', [
    'San José, Costa Rica|city', 'La Fortuna, Costa Rica|nature', 'Arenal, Costa Rica|mountain',
    'Monteverde, Costa Rica|nature', 'Manuel Antonio, Costa Rica|coast', 'San José, Costa Rica|city',
  ]),
  t('t6', 'Cusco and the Sacred Valley', ['Cusco', 'Sacred Valley'], 'PEN', 'May – Sep', [
    'Cusco, Peru|heritage', 'Cusco, Peru|city', 'Pisac, Peru|town', 'Ollantaytambo, Peru|heritage',
    'Aguas Calientes, Peru|road', 'Machu Picchu, Peru|heritage', 'Cusco, Peru|city',
  ]),
  t('t6', 'Bolivia, altiplano and salt', ['La Paz', 'Uyuni'], 'BOB', 'May – Oct', [
    'La Paz, Bolivia|city', 'La Paz, Bolivia|mountain', 'Copacabana, Bolivia|nature',
    'Isla del Sol, Bolivia|nature', 'Sucre, Bolivia|heritage', 'Potosí, Bolivia|heritage',
    'Uyuni, Bolivia|road', 'Salar de Uyuni, Bolivia|desert', 'Salar de Uyuni, Bolivia|desert',
    'La Paz, Bolivia|city',
  ]),
  t('t6', 'Brazil, Rio to Salvador', ['Rio de Janeiro', 'Salvador'], 'BRL', 'Apr – Oct', [
    'Rio de Janeiro, Brazil|city', 'Rio de Janeiro, Brazil|coast', 'Ilha Grande, Brazil|coast',
    'Paraty, Brazil|town', 'Rio de Janeiro, Brazil|city', 'Belo Horizonte, Brazil|city',
    'Ouro Preto, Brazil|heritage', 'Chapada Diamantina, Brazil|mountain',
    'Chapada Diamantina, Brazil|nature', 'Salvador, Brazil|heritage', 'Salvador, Brazil|city',
    'Morro de São Paulo, Brazil|coast',
  ]),
  t('t6', 'Patagonia, the full traverse', ['Patagonia', 'El Chaltén'], 'ARS', 'Nov – Mar', [
    'El Calafate, Argentina|town', 'Perito Moreno, Argentina|nature', 'El Chaltén, Argentina|mountain',
    'El Chaltén, Argentina|mountain', 'El Chaltén, Argentina|town', 'Puerto Natales, Chile|road',
    'Torres del Paine, Chile|mountain', 'Torres del Paine, Chile|nature',
    'Torres del Paine, Chile|mountain', 'Punta Arenas, Chile|city', 'Ushuaia, Argentina|coast',
    'Ushuaia, Argentina|mountain', 'Tierra del Fuego, Argentina|nature',
    'Bariloche, Argentina|nature', 'Bariloche, Argentina|mountain', 'Buenos Aires, Argentina|city',
  ]),

  // ─── t7 · Nora Whitfield · North America & Iceland, expanding into Mexico and the Caribbean ───
  t('t7', 'Portland and the Gorge', ['Portland'], 'USD', 'Jun – Sep', [
    'Portland, Oregon|city', 'Columbia River Gorge, Oregon|nature',
  ]),
  t('t7', 'Mexico City in three days', ['Mexico City'], 'MXN', 'Mar – May', [
    'Mexico City, Mexico|city', 'Teotihuacán, Mexico|heritage', 'Coyoacán, Mexico City|town',
  ]),
  t('t7', 'Vancouver and the Sea to Sky', ['Vancouver'], 'CAD', 'Jun – Sep', [
    'Vancouver, BC|city', 'Squamish, BC|nature', 'Whistler, BC|mountain',
  ]),
  t('t7', 'Havana and Viñales', ['Havana'], 'CUP', 'Nov – Apr', [
    'Havana, Cuba|city', 'Havana, Cuba|heritage', 'Viñales, Cuba|nature',
  ]),
  t('t7', 'The California coast', ['Big Sur', 'San Francisco'], 'USD', 'Apr – Oct', [
    'San Francisco, California|city', 'Monterey, California|coast', 'Big Sur, California|coast',
    'Santa Barbara, California|coast', 'Los Angeles, California|city',
  ]),
  t('t7', 'The Yucatán, ruins and cenotes', ['Yucatán', 'Tulum'], 'MXN', 'Nov – Apr', [
    'Cancún, Mexico|coast', 'Tulum, Mexico|heritage', 'Valladolid, Mexico|town',
    'Chichén Itzá, Mexico|heritage', 'Mérida, Mexico|city', 'Celestún, Mexico|nature',
  ]),
  t('t7', 'Iceland, the south coast', ['Iceland', 'Reykjavík'], 'ISK', 'Jun – Aug', [
    'Reykjavík, Iceland|city', 'Golden Circle, Iceland|nature', 'Vík, Iceland|coast',
    'Jökulsárlón, Iceland|nature', 'Höfn, Iceland|town', 'Skaftafell, Iceland|mountain',
    'Reykjavík, Iceland|city',
  ]),
  t('t7', 'Utah and the desert parks', ['Utah', 'Moab'], 'USD', 'Apr – Oct', [
    'Las Vegas, Nevada|city', 'Zion, Utah|mountain', 'Bryce Canyon, Utah|mountain',
    'Escalante, Utah|desert', 'Capitol Reef, Utah|desert', 'Moab, Utah|town',
    'Arches, Utah|desert', 'Canyonlands, Utah|desert', 'Monument Valley, Utah|desert',
    'Page, Arizona|town',
  ]),
  t('t7', 'The Canadian Rockies', ['Banff', 'Jasper'], 'CAD', 'Jun – Sep', [
    'Calgary, Alberta|city', 'Banff, Alberta|town', 'Banff, Alberta|mountain',
    'Lake Louise, Alberta|nature', 'Icefields Parkway, Alberta|road', 'Jasper, Alberta|mountain',
    'Jasper, Alberta|nature', 'Wells Gray, BC|nature', 'Kamloops, BC|road',
    'Whistler, BC|mountain', 'Vancouver, BC|city', 'Vancouver, BC|coast',
  ]),
  t('t7', 'The Pacific Northwest, end to end', ['Pacific Northwest', 'Portland'], 'USD', 'Jul – Sep', [
    'Seattle, Washington|city', 'Seattle, Washington|coast', 'Olympic, Washington|nature',
    'Olympic, Washington|coast', 'Mount Rainier, Washington|mountain', 'Portland, Oregon|city',
    'Columbia River Gorge, Oregon|nature', 'Mount Hood, Oregon|mountain',
    'Bend, Oregon|town', 'Crater Lake, Oregon|nature', 'Oregon Coast|coast',
    'Cannon Beach, Oregon|coast', 'Astoria, Oregon|town', 'Redwoods, California|nature',
    'Mount Shasta, California|mountain', 'Portland, Oregon|city',
  ]),

  // ─── t8 · Amara Diallo · Africa, expanding into West Africa and the Horn ──────────────────────
  t('t8', 'Gorée and Dakar', ['Dakar'], 'XOF', 'Nov – May', [
    'Gorée Island, Senegal|heritage', 'Dakar, Senegal|city',
  ]),
  t('t8', 'Chefchaouen and the Rif', ['Chefchaouen'], 'MAD', 'Apr – Jun', [
    'Chefchaouen, Morocco|town', 'Rif Mountains, Morocco|mountain', 'Tangier, Morocco|city',
  ]),
  t('t8', 'Zanzibar, three days', ['Zanzibar'], 'TZS', 'Jun – Oct', [
    'Stone Town, Zanzibar|heritage', 'Nungwi, Zanzibar|coast', 'Jozani Forest, Zanzibar|nature',
  ]),
  t('t8', 'Accra and the coast forts', ['Accra'], 'GHS', 'Nov – Mar', [
    'Accra, Ghana|city', 'Cape Coast, Ghana|heritage', 'Kakum, Ghana|nature',
  ]),
  t('t8', 'The Cape in five days', ['Cape Town'], 'ZAR', 'Nov – Mar', [
    'Cape Town, South Africa|city', 'Table Mountain, Cape Town|mountain',
    'Cape Point, South Africa|coast', 'Stellenbosch, South Africa|town',
    'Camps Bay, Cape Town|coast',
  ]),
  t('t8', 'Egypt, Cairo to Aswan', ['Cairo', 'Luxor'], 'EGP', 'Oct – Apr', [
    'Cairo, Egypt|city', 'Giza, Egypt|heritage', 'Luxor, Egypt|heritage',
    'Luxor, Egypt|heritage', 'Aswan, Egypt|town', 'Abu Simbel, Egypt|heritage',
  ]),
  t('t8', 'Morocco, Atlas to Sahara', ['Marrakech', 'Merzouga'], 'MAD', 'Mar – May', [
    'Marrakech, Morocco|city', 'Marrakech, Morocco|heritage', 'Ait Benhaddou, Morocco|heritage',
    'Dades Valley, Morocco|mountain', 'Merzouga, Morocco|desert', 'Merzouga, Morocco|desert',
    'Marrakech, Morocco|city',
  ]),
  t('t8', 'Namibia, dunes to Etosha', ['Namibia', 'Sossusvlei'], 'NAD', 'May – Oct', [
    'Windhoek, Namibia|city', 'Sossusvlei, Namibia|desert', 'Sossusvlei, Namibia|desert',
    'Swakopmund, Namibia|coast', 'Damaraland, Namibia|desert', 'Etosha, Namibia|nature',
    'Etosha, Namibia|nature', 'Waterberg, Namibia|mountain', 'Kalahari, Namibia|desert',
    'Windhoek, Namibia|city',
  ]),
  t('t8', 'Ethiopia, the northern circuit', ['Lalibela', 'Simien Mountains'], 'ETB', 'Oct – Mar', [
    'Addis Ababa, Ethiopia|city', 'Addis Ababa, Ethiopia|city', 'Lalibela, Ethiopia|heritage',
    'Lalibela, Ethiopia|heritage', 'Gondar, Ethiopia|heritage', 'Simien Mountains, Ethiopia|mountain',
    'Simien Mountains, Ethiopia|mountain', 'Bahir Dar, Ethiopia|town', 'Lake Tana, Ethiopia|nature',
    'Axum, Ethiopia|heritage', 'Addis Ababa, Ethiopia|city', 'Addis Ababa, Ethiopia|city',
  ]),
  t('t8', 'East Africa, plains to islands', ['Serengeti', 'Zanzibar'], 'TZS', 'Jun – Oct', [
    'Nairobi, Kenya|city', 'Masai Mara, Kenya|nature', 'Masai Mara, Kenya|nature',
    'Serengeti, Tanzania|nature', 'Serengeti, Tanzania|nature', 'Serengeti, Tanzania|nature',
    'Ngorongoro, Tanzania|nature', 'Ngorongoro, Tanzania|mountain', 'Arusha, Tanzania|town',
    'Kilimanjaro, Tanzania|mountain', 'Kilimanjaro, Tanzania|mountain',
    'Stone Town, Zanzibar|heritage', 'Nungwi, Zanzibar|coast', 'Paje, Zanzibar|coast',
    'Zanzibar, Tanzania|coast', 'Dar es Salaam, Tanzania|city',
  ]),

  // ─── t9 · Rohan Mehta · South Asia, expanding into the Himalaya and Indian Ocean ──────────────
  t('t9', 'Mumbai and Elephanta', ['Mumbai'], 'INR', 'Nov – Feb', [
    'Mumbai, India|city', 'Elephanta Caves, Mumbai|heritage',
  ]),
  t('t9', 'Kandy and the rock forts', ['Kandy'], 'LKR', 'Jan – Mar', [
    'Kandy, Sri Lanka|town', 'Sigiriya, Sri Lanka|heritage', 'Dambulla, Sri Lanka|heritage',
  ]),
  t('t9', 'Pokhara, three days', ['Pokhara'], 'NPR', 'Oct – Nov', [
    'Pokhara, Nepal|town', 'Sarangkot, Pokhara|mountain', 'Phewa Lake, Pokhara|nature',
  ]),
  t('t9', 'Malé and Maafushi', ['Maldives'], 'MVR', 'Nov – Apr', [
    'Malé, Maldives|city', 'Maafushi, Maldives|coast', 'Malé Atoll, Maldives|coast',
  ]),
  t('t9', 'Kerala, hills to backwaters', ['Kerala', 'Alleppey'], 'INR', 'Oct – Mar', [
    'Kochi, India|city', 'Munnar, India|mountain', 'Thekkady, India|nature',
    'Alleppey, India|nature', 'Kovalam, India|coast',
  ]),
  t('t9', 'Rajasthan, forts and desert', ['Jaipur', 'Jaisalmer'], 'INR', 'Nov – Feb', [
    'Jaipur, India|heritage', 'Jaipur, India|city', 'Jodhpur, India|heritage',
    'Jaisalmer, India|desert', 'Jaisalmer, India|desert', 'Udaipur, India|town',
  ]),
  t('t9', 'Sri Lanka, hill country by rail', ['Sri Lanka', 'Ella'], 'LKR', 'Jan – Mar', [
    'Colombo, Sri Lanka|city', 'Kandy, Sri Lanka|town', 'Ella, Sri Lanka|mountain',
    'Nuwara Eliya, Sri Lanka|nature', 'Yala, Sri Lanka|nature', 'Galle, Sri Lanka|heritage',
    'Mirissa, Sri Lanka|coast',
  ]),
  t('t9', 'Bhutan, west to centre', ['Bhutan', 'Paro'], 'BTN', 'Mar – May', [
    'Paro, Bhutan|town', "Tiger's Nest, Paro|mountain", 'Thimphu, Bhutan|city',
    'Thimphu, Bhutan|heritage', 'Punakha, Bhutan|heritage', 'Phobjikha, Bhutan|nature',
    'Bumthang, Bhutan|town', 'Bumthang, Bhutan|heritage', 'Paro, Bhutan|heritage',
    'Paro, Bhutan|town',
  ]),
  t('t9', 'Ladakh and Kashmir', ['Ladakh', 'Leh'], 'INR', 'Jun – Sep', [
    'Delhi, India|city', 'Leh, Ladakh|town', 'Leh, Ladakh|heritage',
    'Nubra Valley, Ladakh|desert', 'Nubra Valley, Ladakh|desert', 'Pangong Lake, Ladakh|nature',
    'Hemis, Ladakh|heritage', 'Lamayuru, Ladakh|mountain', 'Kargil, Ladakh|road',
    'Srinagar, Kashmir|nature', 'Srinagar, Kashmir|town', 'Delhi, India|city',
  ]),
  t('t9', 'Everest Base Camp, the long way', ['Khumbu', 'Kathmandu'], 'NPR', 'Mar – May', [
    'Kathmandu, Nepal|city', 'Kathmandu, Nepal|heritage', 'Lukla, Nepal|road',
    'Phakding, Nepal|town', 'Namche Bazaar, Nepal|mountain', 'Namche Bazaar, Nepal|town',
    'Tengboche, Nepal|heritage', 'Dingboche, Nepal|mountain', 'Dingboche, Nepal|mountain',
    'Lobuche, Nepal|mountain', 'Everest Base Camp, Nepal|mountain', 'Gorak Shep, Nepal|mountain',
    'Pheriche, Nepal|town', 'Namche Bazaar, Nepal|mountain', 'Lukla, Nepal|town',
    'Kathmandu, Nepal|city',
  ]),

  // ─── t10 · Ingrid Solberg · Northern Europe, expanding into the Arctic fringe ─────────────────
  t('t10', 'Bergen and Fløyen', ['Bergen'], 'NOK', 'May – Sep', [
    'Bergen, Norway|city', 'Fløyen, Bergen|mountain',
  ]),
  t('t10', 'Copenhagen, three days', ['Copenhagen'], 'DKK', 'May – Sep', [
    'Copenhagen, Denmark|city', 'Christianshavn, Copenhagen|town', 'Helsingør, Denmark|heritage',
  ]),
  t('t10', 'Stockholm and the archipelago', ['Stockholm'], 'SEK', 'Jun – Aug', [
    'Stockholm, Sweden|city', 'Gamla Stan, Stockholm|heritage', 'Stockholm Archipelago|coast',
  ]),
  t('t10', 'Nuuk, three days', ['Nuuk'], 'DKK', 'Jun – Sep', [
    'Nuuk, Greenland|town', 'Nuuk Fjord, Greenland|nature', 'Nuuk, Greenland|coast',
  ]),
  t('t10', 'Lofoten in summer', ['Lofoten'], 'NOK', 'Jun – Aug', [
    'Svolvær, Lofoten|town', 'Reine, Lofoten|coast', 'Hamnøy, Lofoten|coast',
    'Henningsvær, Lofoten|town', 'Nusfjord, Lofoten|coast',
  ]),
  t('t10', 'Lapland in deep winter', ['Finnish Lapland', 'Rovaniemi'], 'EUR', 'Dec – Mar', [
    'Rovaniemi, Finland|town', 'Rovaniemi, Finland|nature', 'Inari, Finland|nature',
    'Saariselkä, Finland|mountain', 'Levi, Finland|mountain', 'Rovaniemi, Finland|town',
  ]),
  t('t10', 'Iceland, north and west', ['Iceland', 'Akureyri'], 'ISK', 'Jun – Aug', [
    'Reykjavík, Iceland|city', 'Snæfellsnes, Iceland|coast', 'Akureyri, Iceland|town',
    'Mývatn, Iceland|nature', 'Húsavík, Iceland|coast', 'Westfjords, Iceland|mountain',
    'Reykjavík, Iceland|city',
  ]),
  t('t10', 'The Norwegian fjords', ['Norway', 'Bergen'], 'NOK', 'May – Sep', [
    'Oslo, Norway|city', 'Flåm, Norway|nature', 'Bergen, Norway|city',
    'Hardanger, Norway|nature', 'Geiranger, Norway|nature', 'Ålesund, Norway|coast',
    'Trollstigen, Norway|road', 'Åndalsnes, Norway|mountain', 'Trondheim, Norway|city',
    'Oslo, Norway|city',
  ]),
  t('t10', 'Arctic Norway and Svalbard', ['Svalbard', 'Tromsø'], 'NOK', 'Mar – Sep', [
    'Tromsø, Norway|city', 'Tromsø, Norway|mountain', 'Senja, Norway|coast',
    'Lofoten, Norway|coast', 'Lofoten, Norway|mountain', 'Narvik, Norway|road',
    'Alta, Norway|town', 'Nordkapp, Norway|coast', 'Longyearbyen, Svalbard|town',
    'Longyearbyen, Svalbard|coast', 'Svalbard, Norway|nature', 'Svalbard, Norway|mountain',
  ]),
  t('t10', 'The Faroes and Iceland', ['Faroe Islands', 'Iceland'], 'DKK', 'Jun – Aug', [
    'Tórshavn, Faroe Islands|town', 'Tórshavn, Faroe Islands|city', 'Vágar, Faroe Islands|nature',
    'Gásadalur, Faroe Islands|coast', 'Saksun, Faroe Islands|nature',
    'Kalsoy, Faroe Islands|mountain', 'Tórshavn, Faroe Islands|coast',
    'Reykjavík, Iceland|city', 'Reykjavík, Iceland|city', 'Golden Circle, Iceland|nature',
    'Vík, Iceland|coast', 'Jökulsárlón, Iceland|nature', 'Höfn, Iceland|town',
    'Egilsstaðir, Iceland|road', 'Akureyri, Iceland|town', 'Reykjavík, Iceland|city',
  ]),
];

module.exports = { SPECS, buildTrip };
