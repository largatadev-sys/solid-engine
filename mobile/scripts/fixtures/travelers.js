const day = (at, title, activities) => ({ at, title, activities });
const act = (title, timeOfDay, place, notes, extra = {}) => ({ title, timeOfDay, place, notes, ...extra });
const cost = (costAmount, costCurrency) => ({ costAmount, costCurrency });


const TRAVELERS = [
  {
    tag: 't1',
    name: 'Maya Ocampo',
    handle: 'mayaocampo',
    bird: 'philippine eagle',
    homeCity: 'Cebu City',
    bio: 'Diving instructor. Mostly underwater, occasionally on land.',
    region: 'Southeast Asia',
    trips: [
      {
        title: 'Cebu, south to north',
        destinations: ['Cebu'],
        description:
          'Five days chasing the parts of Cebu that are not the city. Rented a motorbike on day two '
          + 'and regretted nothing except the sunburn.',
        standouts: ['Canyoneering to Kawasan before the tour buses', 'Sardine run at Moalboal, ten metres from shore'],
        bestTimeOfYear: 'Jan – May',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Oslob, Cebu, Philippines', 'Whale sharks at dawn', [
            act('Whale shark briefing and boat out', '05:30', 'Tan-awan, Oslob', 'Be there by five. The queue is real.', cost('1000', 'PHP')),
            act('Sumilon sandbar', '09:00', 'Sumilon Island', 'The sandbar moves with the season — ask before booking.', cost('1500', 'PHP')),
          ]),
          day('Kawasan Falls, Badian, Cebu', 'Canyoneering', [
            act('Canyoneering, Matutinao to Kawasan', '06:00', 'Matutinao, Badian', 'Three hours of jumping. Wear shoes you can swim in.', cost('1500', 'PHP')),
            act('Late lunch at the third falls', '12:30', 'Kawasan Falls', null, cost('250', 'PHP')),
          ]),
          day('Moalboal, Cebu, Philippines', 'The sardine run', [
            act('Sardine run at Panagsama', '07:00', 'Panagsama Beach, Moalboal', 'Swim straight out about thirty metres. You will hear it before you see it.', cost('0', 'PHP')),
            act('Pescador Island dive', '10:00', 'Pescador Island', null, cost('2200', 'PHP')),
            act('Sunset at Basdaku', '17:30', 'Basdaku White Beach', 'The only west-facing beach on this side.', cost('0', 'PHP')),
          ]),
          day('Sirao Flower Garden, Cebu', 'Up into the hills', [
            act('Sirao Garden', '08:00', 'Sirao, Cebu City', 'Called the Little Amsterdam locally. It is a celosia farm and it is very pink.', cost('100', 'PHP')),
            act('Temple of Leah', '11:00', 'Busay, Cebu City', 'Unfinished and strange. Worth it for the view back over the city.', cost('120', 'PHP')),
          ]),
          day('Cebu City, Philippines', 'City on the last day', [
            act('Magellan\'s Cross and Basilica', '09:00', 'Downtown Cebu City', null, cost('0', 'PHP')),
            act('Larsian barbecue', '19:00', 'Fuente Osmeña', 'Point at what you want, they grill it in front of you.', cost('300', 'PHP')),
          ]),
        ],
      },
      {
        title: 'Bali on a motorbike',
        destinations: ['Bali'],
        description: 'Ubud inland first, then south to the coast. Nine days, one helmet, no plan past day three.',
        standouts: ['Sidemen valley over Ubud, every time'],
        bestTimeOfYear: 'Apr – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Ubud, Bali, Indonesia', 'Ubud', [
            act('Tegallalang rice terraces', '07:00', 'Tegallalang, Ubud', 'Early or not at all.', cost('50000', 'IDR')),
            act('Campuhan Ridge walk', '16:30', 'Ubud', null, cost('0', 'IDR')),
          ]),
          day('Mount Batur, Bali', 'Sunrise hike', [
            act('Batur summit trek', '03:30', 'Kintamani, Bali', 'Pickup at half three. Cold at the top — bring a layer.', cost('450000', 'IDR')),
          ]),
          day('Uluwatu, Bali', 'South coast', [
            act('Uluwatu Temple at sunset', '17:00', 'Pecatu, Uluwatu', 'Watch the monkeys, they take sunglasses.', cost('50000', 'IDR')),
            act('Padang Padang beach', '10:00', 'Pecatu', null, cost('20000', 'IDR')),
          ]),
        ],
      },
      {
        title: 'Northern Vietnam, slowly',
        destinations: ['Hanoi', 'Ha Giang'],
        description: null,
        standouts: [],
        bestTimeOfYear: 'Sep – Nov',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Hanoi, Vietnam', 'Hanoi', [
            act('Old Quarter on foot', '09:00', 'Hoan Kiem, Hanoi', 'No route. Just walk.', {}),
          ]),
          day('Ha Giang, Vietnam', 'The loop', [
            act('Ha Giang loop, day one', '08:00', 'Ha Giang', 'Three days if you rush, four if you do not.', {}),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't2',
    name: 'Kenji Nakamura',
    handle: 'kenjinakamura',
    bird: 'japanese crane',
    homeCity: 'Osaka',
    bio: 'Architect. I photograph buildings and eat too much ramen.',
    region: 'East Asia',
    trips: [
      {
        title: 'Japan in the shoulder season',
        destinations: ['Tokyo', 'Hakone', 'Kyoto', 'Osaka'],
        description:
          'Two weeks in late October, which everyone told me was the right call. They were right. '
          + 'Trains for everything except Hakone.',
        standouts: ['Fuji clear for three straight days', 'Fushimi Inari at 6am, alone the whole way up'],
        bestTimeOfYear: 'Oct – Nov',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Mount Fuji, Japan', 'Fuji from Hakone', [
            act('Hakone Ropeway', '09:00', 'Hakone, Kanagawa', 'Owakudani side first — Fuji is behind you coming back.', cost('2500', 'JPY')),
            act('Lake Ashi pirate ship', '13:00', 'Lake Ashi, Hakone', 'Silly boat, correct view.', cost('1200', 'JPY')),
            act('Onsen at the ryokan', '18:00', 'Hakone-Yumoto', null, {}),
          ]),
          day('Kyoto, Japan', 'Kyoto, early', [
            act('Fushimi Inari before six', '05:45', 'Fushimi, Kyoto', 'The whole point is being alone on it. Six is already late.', cost('0', 'JPY')),
            act('Nishiki Market', '11:00', 'Nakagyo, Kyoto', null, cost('2000', 'JPY')),
            act('Philosopher\'s Path', '16:00', 'Higashiyama, Kyoto', 'Two kilometres of canal. Do it slowly.', cost('0', 'JPY')),
          ]),
          day('Arashiyama, Kyoto, Japan', 'West of the city', [
            act('Bamboo grove', '07:00', 'Arashiyama, Kyoto', null, cost('0', 'JPY')),
            act('Monkey park', '10:00', 'Arashiyama', 'Steep climb. The monkeys are at the top and they are unbothered.', cost('550', 'JPY')),
          ]),
          day('Osaka, Japan', 'Home ground', [
            act('Dotonbori at night', '19:00', 'Namba, Osaka', 'Loud, bright, exactly as advertised.', cost('3000', 'JPY')),
            act('Kuromon Ichiba', '10:00', 'Nipponbashi, Osaka', null, cost('2500', 'JPY')),
          ]),
        ],
      },
      {
        title: 'Seoul, five days',
        destinations: ['Seoul'],
        description: 'A long weekend that became five days because of a typhoon. No complaints.',
        standouts: ['Bukhansan on a clear morning'],
        bestTimeOfYear: 'Sep – Nov',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Seoul, South Korea', 'Palaces', [
            act('Gyeongbokgung', '09:00', 'Jongno, Seoul', 'Free entry in hanbok, which half the queue is wearing.', cost('3000', 'KRW')),
            act('Bukchon Hanok Village', '13:00', 'Jongno, Seoul', 'People live here. Keep it down.', cost('0', 'KRW')),
          ]),
          day('Bukhansan, South Korea', 'Up the mountain', [
            act('Bukhansan Baegundae peak', '07:00', 'Bukhansan National Park', 'Four hours return. Granite slabs near the top with chains.', cost('0', 'KRW')),
          ]),
        ],
      },
      {
        title: 'Taipei, eating',
        destinations: ['Taipei'],
        description: null,
        standouts: [],
        bestTimeOfYear: null,
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Taipei, Taiwan', 'Night markets', [
            act('Raohe Street market', '18:30', 'Songshan, Taipei', 'Pepper buns at the entrance. Queue is worth it.', {}),
            act('Elephant Mountain at dusk', '17:00', 'Xinyi, Taipei', 'Twenty minutes of stairs for the 101 shot.', {}),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't3',
    name: 'Sarah Whitmore',
    handle: 'sarahwhitmore',
    bird: 'kookaburra',
    homeCity: 'Melbourne',
    bio: 'Long drives, cold water swims, terrible playlists.',
    region: 'Oceania',
    trips: [
      {
        title: 'The Great Ocean Road',
        destinations: ['Victoria'],
        description:
          'Four days from Torquay to Port Fairy. Everyone does it in one and misses the entire point.',
        standouts: ['Twelve Apostles at sunrise with nobody there', 'Otways rainforest in the rain, deliberately'],
        bestTimeOfYear: 'Nov – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Great Ocean Road, Australia', 'Torquay to Lorne', [
            act('Bells Beach', '08:00', 'Torquay, VIC', 'Watch from the platform, the path down is closed half the time.', cost('0', 'AUD')),
            act('Split Point Lighthouse', '11:00', 'Aireys Inlet, VIC', null, cost('0', 'AUD')),
            act('Teddy\'s Lookout', '16:00', 'Lorne, VIC', 'The road-and-river shot people think is drone footage.', cost('0', 'AUD')),
          ]),
          day('Great Otway National Park, Australia', 'Into the Otways', [
            act('Triplet Falls loop', '09:00', 'Otway Ranges, VIC', 'Two kilometres, boardwalked, wet underfoot always.', cost('0', 'AUD')),
            act('Cape Otway Lightstation', '13:00', 'Cape Otway, VIC', 'Koalas on the road in — drive slowly.', cost('20', 'AUD')),
          ]),
          day('Twelve Apostles, Australia', 'The limestone coast', [
            act('Twelve Apostles at sunrise', '05:45', 'Port Campbell NP, VIC', 'Gibson Steps first, then the boardwalk. Sunrise, not sunset.', cost('0', 'AUD')),
            act('Loch Ard Gorge', '08:30', 'Port Campbell NP, VIC', null, cost('0', 'AUD')),
            act('London Arch', '10:30', 'Peterborough, VIC', null, cost('0', 'AUD')),
          ]),
          day('Port Fairy, Australia', 'The quiet end', [
            act('Griffiths Island walk', '08:00', 'Port Fairy, VIC', 'Shearwaters from September. Loop is an hour.', cost('0', 'AUD')),
          ]),
        ],
      },
      {
        title: 'South Island, two weeks',
        destinations: ['Queenstown', 'Fiordland', 'Wanaka'],
        description: 'Campervan. Rained six days out of fourteen and it was still the best trip I have done.',
        standouts: ['Milford Sound in heavy rain — every cliff becomes a waterfall'],
        bestTimeOfYear: 'Dec – Feb',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Milford Sound, New Zealand', 'Fiordland', [
            act('Milford Sound cruise', '10:00', 'Milford Sound, Fiordland', 'Go on a wet day. Genuinely better.', cost('110', 'NZD')),
            act('The drive in from Te Anau', '07:00', 'Milford Road, SI', 'Two hours, stop constantly, Homer Tunnel is one-way on lights.', cost('0', 'NZD')),
          ]),
          day('Lake Wanaka, New Zealand', 'Wanaka', [
            act('Roys Peak', '05:00', 'Wanaka, Otago', 'Six hours return, sixteen hundred metres up. Start in the dark.', cost('0', 'NZD')),
            act('That Wanaka Tree', '19:30', 'Lake Wanaka', 'It is a tree in a lake and there will be nine people photographing it.', cost('0', 'NZD')),
          ]),
          day('Queenstown, New Zealand', 'Queenstown', [
            act('Ben Lomond track', '08:00', 'Queenstown, Otago', null, cost('0', 'NZD')),
            act('Fergburger, eventually', '21:00', 'Shotover St, Queenstown', 'The queue is forty minutes and yes it is worth it.', cost('19', 'NZD')),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't4',
    name: 'Ana Duarte',
    handle: 'anaduarte',
    bird: 'european robin',
    homeCity: 'Lisbon',
    bio: 'Trains only. I have not flown in four years.',
    region: 'Western Europe',
    trips: [
      {
        title: 'Portugal end to end',
        destinations: ['Lisbon', 'Sintra', 'Porto', 'Douro'],
        description: 'Ten days, all of it by train except Sintra, which is also by train but feels illegal.',
        standouts: ['Douro valley in September, during harvest'],
        bestTimeOfYear: 'Apr – Jun · Sep – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Lisbon, Portugal', 'Alfama and the hills', [
            act('Alfama, downhill from the castle', '09:30', 'Alfama, Lisbon', 'Start at the top. Every guide starts at the bottom and it is wrong.', cost('0', 'EUR')),
            act('Miradouro da Senhora do Monte', '18:30', 'Graça, Lisbon', 'The one with no tour buses.', cost('0', 'EUR')),
          ]),
          day('Sintra, Portugal', 'Sintra', [
            act('Pena Palace', '09:00', 'Sintra', 'First entry slot or do not bother.', cost('14', 'EUR')),
            act('Quinta da Regaleira', '13:00', 'Sintra', 'The inverted well. Go down it, not up.', cost('12', 'EUR')),
          ]),
          day('Porto, Portugal', 'Porto', [
            act('Livraria Lello', '09:30', 'Baixa, Porto', 'Timed ticket, redeemable against a book.', cost('8', 'EUR')),
            act('Port tasting in Gaia', '16:00', 'Vila Nova de Gaia', null, cost('25', 'EUR')),
            act('Sunset from Jardim do Morro', '19:00', 'Vila Nova de Gaia', 'Free, and better than any of the paid terraces.', cost('0', 'EUR')),
          ]),
          day('Douro Valley, Portugal', 'The valley', [
            act('Train to Pinhão', '08:30', 'Porto São Bento', 'Sit on the right after Régua. The line runs along the river.', cost('14', 'EUR')),
            act('Quinta walk and lunch', '12:00', 'Pinhão, Douro', null, cost('45', 'EUR')),
          ]),
        ],
      },
      {
        title: 'Swiss trains in winter',
        destinations: ['Interlaken', 'Zermatt'],
        description: null,
        standouts: ['Glacier Express, second class, window seat'],
        bestTimeOfYear: 'Dec – Mar',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Matterhorn, Switzerland', 'Zermatt', [
            act('Gornergrat railway', '08:00', 'Zermatt, Valais', 'Right-hand side going up.', cost('88', 'CHF')),
            act('Sunnegga at sunset', '16:30', 'Zermatt', null, cost('26', 'CHF')),
          ]),
          day('Lauterbrunnen, Switzerland', 'The valley of waterfalls', [
            act('Trümmelbach Falls', '10:00', 'Lauterbrunnen, Bern', 'Inside the mountain. Cold and extremely loud.', cost('14', 'CHF')),
          ]),
        ],
      },
      {
        title: 'Amsterdam, long weekend',
        destinations: ['Amsterdam'],
        description: null,
        standouts: [],
        bestTimeOfYear: null,
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Amsterdam, Netherlands', 'Canals', [
            act('Jordaan on foot', '10:00', 'Jordaan, Amsterdam', null, {}),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't5',
    name: 'Dimitri Stavros',
    handle: 'dimitristavros',
    bird: 'greek pelican',
    homeCity: 'Athens',
    bio: 'Islands, mostly. Ferry timetables are my love language.',
    region: 'Mediterranean',
    trips: [
      {
        title: 'Cyclades by ferry',
        destinations: ['Naxos', 'Milos', 'Santorini'],
        description: 'Three islands in twelve days. Slow ferries on purpose — the fast ones have no deck.',
        standouts: ['Sarakiniko at first light, before anyone', 'Naxos for the food, not the beaches'],
        bestTimeOfYear: 'May – Jun · Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Naxos, Greece', 'Naxos', [
            act('Portara at sunset', '19:30', 'Chora, Naxos', 'Arrive an hour early for a spot on the marble.', cost('0', 'EUR')),
            act('Halki and the old olive press', '11:00', 'Halki, Naxos', null, cost('5', 'EUR')),
          ]),
          day('Milos, Greece', 'Milos', [
            act('Sarakiniko at dawn', '06:00', 'Sarakiniko, Milos', 'White volcanic rock. Looks like a moon and photographs like one.', cost('0', 'EUR')),
            act('Kleftiko by boat', '10:00', 'Kleftiko, Milos', 'Only reachable by sea. Full-day boat.', cost('65', 'EUR')),
          ]),
          day('Santorini, Greece', 'Santorini, briefly', [
            act('Oia, away from the main street', '17:00', 'Oia, Santorini', 'Walk north past the crowds. Same view, nobody in it.', cost('0', 'EUR')),
            act('Ancient Thera', '09:00', 'Mesa Vouno, Santorini', 'Nobody goes and it is the best thing on the island.', cost('6', 'EUR')),
          ]),
        ],
      },
      {
        title: 'Croatia, Dubrovnik north',
        destinations: ['Dubrovnik', 'Hvar', 'Split'],
        description: null,
        standouts: [],
        bestTimeOfYear: 'May – Oct',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Dubrovnik, Croatia', 'The walls', [
            act('City walls at opening', '08:00', 'Old Town, Dubrovnik', 'Two hours, no shade, go at eight.', cost('35', 'EUR')),
            act('Lokrum island', '13:00', 'Lokrum, Dubrovnik', null, cost('27', 'EUR')),
          ]),
          day('Hvar, Croatia', 'Hvar', [
            act('Pakleni Islands boat', '10:00', 'Hvar Town', null, cost('40', 'EUR')),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't6',
    name: 'Lucia Fernández',
    handle: 'luciafernandez',
    bird: 'andean condor',
    homeCity: 'Buenos Aires',
    bio: 'Mountains and long bus rides. Patagonia four times and counting.',
    region: 'South America',
    trips: [
      {
        title: 'Patagonia, both sides',
        destinations: ['El Chaltén', 'Torres del Paine'],
        description:
          'Three weeks, two countries, one border crossing that took six hours. Wind every single day.',
        standouts: ['Fitz Roy clear at sunrise — one morning in nine', 'The W trek, self-catered'],
        bestTimeOfYear: 'Nov – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Fitz Roy, Argentina', 'El Chaltén', [
            act('Laguna de los Tres', '04:00', 'El Chaltén, Santa Cruz', 'Ten hours return. Last kilometre is straight up scree in the dark.', cost('0', 'ARS')),
            act('Chorrillo del Salto', '16:00', 'El Chaltén', 'Easy hour. Good for a rest day.', cost('0', 'ARS')),
          ]),
          day('Perito Moreno Glacier, Argentina', 'The glacier', [
            act('Perito Moreno boardwalks', '09:00', 'Los Glaciares NP', 'Stay for the calving. It happens roughly hourly and you feel it.', cost('12000', 'ARS')),
          ]),
          day('Torres del Paine, Chile', 'Into Chile', [
            act('Base de las Torres', '05:30', 'Torres del Paine NP', 'Nine hours. The last hour is boulders.', cost('0', 'CLP')),
            act('Salto Grande', '15:00', 'Torres del Paine NP', null, cost('0', 'CLP')),
          ]),
        ],
      },
      {
        title: 'Peru: Cusco and the valley',
        destinations: ['Cusco', 'Sacred Valley'],
        description: null,
        standouts: ['Two days acclimatising in Cusco. Not optional.'],
        bestTimeOfYear: 'May – Sep',
        lifecycle: 'completed',
        publish: 'private',
        days: [
          day('Machu Picchu, Peru', 'Machu Picchu', [
            act('First entry, Circuit 2', '06:00', 'Machu Picchu, Cusco', 'Book sixty days out. Circuit decides what you see.', cost('152', 'PEN')),
            act('Huayna Picchu', '10:00', 'Machu Picchu', 'Separate ticket, separate queue, very steep.', cost('200', 'PEN')),
          ]),
          day('Rainbow Mountain, Peru', 'Vinicunca', [
            act('Vinicunca trek', '04:00', 'Cusipata, Cusco', 'Five thousand metres. Do not attempt on day one.', cost('120', 'PEN')),
          ]),
          day('Cusco, Peru', 'Cusco', [
            act('San Pedro market', '08:00', 'Cusco', null, cost('30', 'PEN')),
            act('Sacsayhuamán', '14:00', 'Cusco', 'Walk up from the plaza, it is closer than it looks.', cost('70', 'PEN')),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't7',
    name: 'Marcus Bell',
    handle: 'marcusbell',
    bird: 'bald eagle',
    homeCity: 'Portland',
    bio: 'Road trips and hot springs. Van is older than my car.',
    region: 'North America & Iceland',
    trips: [
      {
        title: 'Iceland ring road',
        destinations: ['Reykjavík', 'Vík', 'Jökulsárlón'],
        description: 'Ten days clockwise in a van in September. Aurora on four nights.',
        standouts: ['Jökulsárlón and Diamond Beach on the same morning', 'Hot springs nobody signposts'],
        bestTimeOfYear: 'Jun – Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Skógafoss, Iceland', 'The south coast', [
            act('Seljalandsfoss, walk behind it', '08:00', 'Seljalandsfoss, South Iceland', 'You will get soaked. Waterproof everything.', cost('800', 'ISK')),
            act('Skógafoss and the stairs', '10:30', 'Skógafoss', '370 steps to the top and the trail keeps going for 20km.', cost('0', 'ISK')),
            act('Reynisfjara black sand', '15:00', 'Vík í Mýrdal', 'Sneaker waves kill people here every year. Stay well back.', cost('0', 'ISK')),
          ]),
          day('Jökulsárlón, Iceland', 'Glacier lagoon', [
            act('Jökulsárlón at sunrise', '07:00', 'Jökulsárlón, Southeast Iceland', null, cost('0', 'ISK')),
            act('Diamond Beach', '09:00', 'Breiðamerkursandur', 'Same icebergs, washed up on black sand across the road.', cost('0', 'ISK')),
          ]),
          day('Northern Lights, Iceland', 'Aurora night', [
            act('Aurora watch from the van', '22:30', 'Höfn, Southeast Iceland', 'Check the KP index at dinner, then drive away from town.', cost('0', 'ISK')),
          ]),
        ],
      },
      {
        title: 'Utah, five parks',
        destinations: ['Moab', 'Bryce', 'Zion'],
        description: null,
        standouts: [],
        bestTimeOfYear: 'Apr – May · Sep – Oct',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Arches National Park, Utah', 'Arches', [
            act('Delicate Arch at sunset', '18:00', 'Arches NP, Moab', 'Three miles return, no shade, take two litres.', cost('30', 'USD')),
            act('Windows Section', '08:00', 'Arches NP', null, cost('0', 'USD')),
          ]),
          day('Bryce Canyon, Utah', 'Bryce', [
            act('Navajo Loop and Queens Garden', '07:00', 'Bryce Canyon NP', 'Down Navajo, up Queens. Not the other way.', cost('35', 'USD')),
          ]),
          day('Zion National Park, Utah', 'Zion', [
            act('Angels Landing', '06:00', 'Zion NP', 'Permit by lottery. Chains section is not for everyone.', cost('35', 'USD')),
            act('The Narrows, bottom-up', '13:00', 'Zion NP', 'Check the flash flood forecast. Not a suggestion.', cost('0', 'USD')),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't8',
    name: 'Amina Diallo',
    handle: 'aminadiallo',
    bird: 'lilac breasted roller',
    homeCity: 'Dakar',
    bio: 'Deserts and markets. I buy too many rugs.',
    region: 'Africa',
    trips: [
      {
        title: 'Morocco: Atlas to Sahara',
        destinations: ['Marrakech', 'Merzouga', 'Chefchaouen'],
        description: 'Twelve days. Marrakech, over the Atlas, two nights in the dunes, then north to the blue city.',
        standouts: ['Erg Chebbi dunes at sunrise', 'Fes tanneries — hold the mint sprig they give you'],
        bestTimeOfYear: 'Mar – May · Sep – Nov',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Sahara Desert, Morocco', 'The dunes', [
            act('Camel out to camp', '17:00', 'Erg Chebbi, Merzouga', 'Ninety minutes. Uncomfortable and completely worth it.', cost('600', 'MAD')),
            act('Dune sunrise', '06:00', 'Erg Chebbi', 'Climb the ridge behind camp in the dark.', cost('0', 'MAD')),
          ]),
          day('Marrakech, Morocco', 'Marrakech', [
            act('Jemaa el-Fnaa after dark', '20:00', 'Medina, Marrakech', 'Chaotic. Agree prices before anything.', cost('100', 'MAD')),
            act('Le Jardin Secret', '10:00', 'Medina, Marrakech', 'Quiet, which the medina is not.', cost('80', 'MAD')),
          ]),
          day('Chefchaouen, Morocco', 'The blue city', [
            act('Medina, no map', '09:00', 'Chefchaouen, Rif', null, cost('0', 'MAD')),
            act('Spanish Mosque at sunset', '18:30', 'Chefchaouen', 'Thirty minutes up. The whole blue town below you.', cost('0', 'MAD')),
          ]),
        ],
      },
      {
        title: 'Namibia self-drive',
        destinations: ['Sossusvlei', 'Etosha'],
        description: null,
        standouts: ['Deadvlei at first light'],
        bestTimeOfYear: 'May – Oct',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Sossusvlei, Namibia', 'Dunes and dead trees', [
            act('Dune 45 sunrise', '06:00', 'Sossusvlei, Namib-Naukluft', null, cost('150', 'NAD')),
            act('Deadvlei walk', '08:00', 'Deadvlei', 'One kilometre over sand. Nine-hundred-year-old camelthorn trees.', cost('0', 'NAD')),
          ]),
          day('Etosha National Park, Namibia', 'Waterholes', [
            act('Okaukuejo waterhole', '17:00', 'Etosha NP', 'Sit still and wait. Floodlit after dark.', cost('80', 'NAD')),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't9',
    name: 'Rohan Mehta',
    handle: 'rohanmehta',
    bird: 'indian peacock',
    homeCity: 'Mumbai',
    bio: 'Trekking, forts, and finding the one good chai stall.',
    region: 'South Asia',
    trips: [
      {
        title: 'Everest Base Camp',
        destinations: ['Kathmandu', 'Khumbu'],
        description: 'Sixteen days including acclimatisation. Lukla flight both ways, which is its own event.',
        standouts: ['Kala Patthar at sunrise, 5,600m', 'Namche for two nights, not one'],
        bestTimeOfYear: 'Mar – May · Oct – Nov',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Mount Everest, Nepal', 'Base camp', [
            act('Gorak Shep to Base Camp', '07:00', 'Khumbu, Nepal', 'Three hours over moraine. The camp itself is on the glacier.', cost('0', 'NPR')),
            act('Kala Patthar for sunrise', '04:30', 'Gorak Shep', 'Two hours in the dark at 5,600m. Coldest I have ever been.', cost('0', 'NPR')),
          ]),
          day('Namche Bazaar, Nepal', 'Acclimatising', [
            act('Everest View Hotel hike', '08:00', 'Namche Bazaar, Khumbu', 'Climb high, sleep low. This is the day that decides the trek.', cost('0', 'NPR')),
            act('Sherpa Culture Museum', '14:00', 'Namche Bazaar', null, cost('100', 'NPR')),
          ]),
          day('Kathmandu, Nepal', 'Before and after', [
            act('Boudhanath at dusk', '17:30', 'Boudha, Kathmandu', 'Walk the kora clockwise with everyone else.', cost('400', 'NPR')),
            act('Thamel, gear shopping', '11:00', 'Thamel, Kathmandu', 'Rent the down jacket here, do not buy one.', cost('2000', 'NPR')),
          ]),
        ],
      },
      {
        title: 'Sri Lanka by train',
        destinations: ['Kandy', 'Ella', 'Galle'],
        description: null,
        standouts: ['Kandy to Ella, second class, door open'],
        bestTimeOfYear: 'Dec – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Ella, Sri Lanka', 'Hill country', [
            act('Nine Arch Bridge', '06:30', 'Ella, Badulla', 'Trains at 6:20 and 9:20. Go for the early one.', cost('0', 'LKR')),
            act('Little Adam\'s Peak', '16:00', 'Ella', 'Forty-five minutes up. Easy, and the best view here.', cost('0', 'LKR')),
          ]),
          day('Sigiriya, Sri Lanka', 'The rock', [
            act('Sigiriya Lion Rock', '07:00', 'Sigiriya, Central Province', '1,200 steps. Hornets on the way up in dry season.', cost('30', 'USD')),
          ]),
          day('Galle, Sri Lanka', 'The fort', [
            act('Galle Fort ramparts at sunset', '18:00', 'Galle Fort', null, cost('0', 'LKR')),
          ]),
        ],
      },
      {
        title: 'Rajasthan forts',
        destinations: ['Jaipur', 'Jodhpur', 'Udaipur'],
        description: null,
        standouts: [],
        bestTimeOfYear: 'Nov – Feb',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Jodhpur, India', 'The blue city', [
            act('Mehrangarh Fort', '09:00', 'Jodhpur, Rajasthan', null, {}),
          ]),
        ],
      },
    ],
  },
  {
    tag: 't10',
    name: 'Ingrid Solberg',
    handle: 'ingridsolberg',
    bird: 'atlantic puffin',
    homeCity: 'Bergen',
    bio: 'Cold places, wool everything. Ferries over flights.',
    region: 'Northern Europe',
    trips: [
      {
        title: 'Lofoten in winter',
        destinations: ['Lofoten'],
        description: 'Eight days of four-hour daylight and aurora most nights. Rented a cabin in Reine.',
        standouts: ['Reinebringen when the steps are clear of ice', 'Fishing village lights at 3pm dusk'],
        bestTimeOfYear: 'Feb – Mar · Jun – Aug',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Lofoten Islands, Norway', 'Reine and around', [
            act('Reinebringen sherpa steps', '10:00', 'Reine, Moskenes', '1,978 stone steps. Do not attempt iced without spikes.', cost('0', 'NOK')),
            act('Hamnøy bridge view', '14:00', 'Hamnøy, Lofoten', 'The red rorbuer shot. Ten metres from the road.', cost('0', 'NOK')),
          ]),
          day('Northern Lights, Norway', 'Aurora', [
            act('Aurora from Skagsanden beach', '21:00', 'Flakstad, Lofoten', 'Wide open north-facing beach. Reflections in the wet sand.', cost('0', 'NOK')),
          ]),
          day('Henningsvær, Norway', 'The football pitch village', [
            act('Henningsvær harbour', '11:00', 'Henningsvær, Vågan', null, cost('0', 'NOK')),
            act('Festvågtind hike', '08:00', 'Henningsvær', 'Steep, short, and looks straight down on the village.', cost('0', 'NOK')),
          ]),
        ],
      },
      {
        title: 'Scottish Highlands',
        destinations: ['Skye', 'Glencoe'],
        description: null,
        standouts: ['Quiraing in cloud, which is most days'],
        bestTimeOfYear: 'May – Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Isle of Skye, Scotland', 'Skye', [
            act('Quiraing loop', '08:00', 'Trotternish, Skye', 'Two hours. Boggy, and the path traverses a landslip.', cost('0', 'GBP')),
            act('Fairy Pools', '14:00', 'Glenbrittle, Skye', 'Cold enough to hurt. People swim anyway.', cost('6', 'GBP')),
          ]),
          day('Glencoe, Scotland', 'Glencoe', [
            act('Three Sisters viewpoint', '09:00', 'Glencoe, Highland', null, cost('0', 'GBP')),
            act('Lost Valley walk', '11:00', 'Glencoe', 'River crossing at the start. Wet feet guaranteed.', cost('0', 'GBP')),
          ]),
        ],
      },
      {
        title: 'Faroe Islands',
        destinations: ['Tórshavn'],
        description: null,
        standouts: [],
        bestTimeOfYear: 'May – Aug',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Faroe Islands, Denmark', 'Streymoy', [
            act('Sørvágsvatn, the lake above the ocean', '10:00', 'Vágar, Faroe Islands', 'Optical illusion only works from the far end.', cost('200', 'DKK')),
            act('Gásadalur and Múlafossur', '15:00', 'Vágar', 'The waterfall off the cliff into the sea.', cost('0', 'DKK')),
          ]),
        ],
      },
    ],
  },
];


// Postcards are keyed by trip title + activity so the seeder never guesses which entry to write.
// Only ongoing and completed trips carry them — an entry on a trip that has not started is fiction
// the lifecycle gate refuses anyway.
const POSTCARDS = [
  { trip: 'Cebu, south to north', activity: 'Sardine run at Panagsama',
    caption: 'Swam out thirty metres and the water turned solid silver. Millions of them, and they move like one thing.' },
  { trip: 'Cebu, south to north', activity: 'Canyoneering, Matutinao to Kawasan',
    caption: 'Fourteen jumps, the highest about eight metres. Water was that blue the whole way down.' },
  { trip: 'Japan in the shoulder season', activity: 'Fushimi Inari before six',
    caption: 'Got there at quarter to and had the entire mountain to myself for an hour. Ten thousand gates and nobody in them.' },
  { trip: 'Japan in the shoulder season', activity: 'Hakone Ropeway',
    caption: 'Third clear day in a row. Locals in the car said that basically does not happen in October.' },
  { trip: 'The Great Ocean Road', activity: 'Twelve Apostles at sunrise',
    caption: 'Five forty-five and completely alone. Everyone comes at sunset for the light and misses this.' },
  { trip: 'The Great Ocean Road', activity: 'Triplet Falls loop',
    caption: 'Rained the entire walk which is exactly what you want in the Otways. Everything dripping and green.' },
  { trip: 'South Island, two weeks', activity: 'Milford Sound cruise',
    caption: 'Went out in heavy rain on purpose. Every cliff face turns into a waterfall — hundreds of them.' },
  { trip: 'Portugal end to end', activity: 'Sunset from Jardim do Morro',
    caption: 'Two euros for a beer from the kiosk and the best view in Porto. The paid terraces are behind us and worse.' },
  { trip: 'Cyclades by ferry', activity: 'Sarakiniko at dawn',
    caption: 'Six in the morning on white volcanic rock with nobody else awake. Does not look like earth.' },
  { trip: 'Patagonia, both sides', activity: 'Laguna de los Tres',
    caption: 'Nine days of cloud and then this. Left at four in the dark for the last scree section and it was worth every hour.' },
  { trip: 'Iceland ring road', activity: 'Jökulsárlón at sunrise',
    caption: 'Icebergs calving off the glacier and drifting out to sea. Sat watching for two hours and lost track.' },
  { trip: 'Iceland ring road', activity: 'Aurora watch from the van',
    caption: 'Fourth night in a row. You stop photographing it eventually and just lie on the roof.' },
  { trip: 'Morocco: Atlas to Sahara', activity: 'Dune sunrise',
    caption: 'Climbed the ridge behind camp in the dark. Sand goes orange about ten minutes before the sun clears the horizon.' },
  { trip: 'Everest Base Camp', activity: 'Kala Patthar for sunrise',
    caption: 'Minus twenty-something at 5,600 metres, two hours up in the dark. Everest goes gold first, then everything else.' },
  { trip: 'Sri Lanka by train', activity: 'Nine Arch Bridge',
    caption: 'Waited for the 6:20 with about six other people. Tea plantation on both sides and a hundred-year-old bridge.' },
  { trip: 'Lofoten in winter', activity: 'Aurora from Skagsanden beach',
    caption: 'Green in the sky and green in the wet sand at the same time. Stood there until I could not feel my hands.' },
  { trip: 'Scottish Highlands', activity: 'Quiraing loop',
    caption: 'Cloud the whole way round, which everyone warns you about and which turns out to be the point.' },
  { trip: 'Utah, five parks', activity: 'Delicate Arch at sunset',
    caption: 'Thirty people sat in a natural amphitheatre watching one rock go orange. Worth the three miles.' },
  { trip: 'Croatia, Dubrovnik north', activity: 'City walls at opening',
    caption: 'Eight in the morning to beat the heat and the cruise crowd. Two hours all the way round.' },
  { trip: 'Peru: Cusco and the valley', activity: 'First entry, Circuit 2',
    caption: 'Six a.m. entry with mist still in the valley. It burns off around eight and everything appears at once.' },
];


// The dump is member-contributed by design, so these are searched once and spread across whichever
// trips get a co-traveler. Deliberately generic — a dump is a pile of a trip's photos, not a curated set.
const DUMP_QUERIES = [
  'travel backpack road',
  'street food market asia',
  'mountain trail hikers',
  'ferry boat harbour',
  'campfire evening friends',
  'passport map planning',
];


module.exports = { TRAVELERS, POSTCARDS, DUMP_QUERIES };
