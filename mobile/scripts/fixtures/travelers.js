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
        destination: 'Cebu',
        description:
          'Five days chasing the parts of Cebu that are not the city. Rented a motorbike on day two '
          + 'and regretted nothing except the sunburn.',
        standouts: ['Canyoneering to Kawasan before the tour buses', 'Sardine run at Moalboal, ten metres from shore'],
        bestTimeOfYear: 'Jan – May',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Oslob, Cebu, Philippines', 'Whale sharks at dawn', [
            act('Whale shark briefing and boat out', '05:30', 'Tan-awan, Oslob', 'Be there by five. The queue is real.', {
              ...cost('1000', 'PHP'),
              post: 'Up at four for this. Six metres of animal drifting past your mask and nobody on the boat says a word afterwards.',
            }),
            act('Sumilon sandbar', '09:00', 'Sumilon Island', 'The sandbar moves with the season — ask before booking.', cost('1500', 'PHP')),
          ]),
          day('Kawasan Falls, Badian, Cebu', 'Canyoneering', [
            act('Canyoneering, Matutinao to Kawasan', '06:00', 'Matutinao, Badian', 'Three hours of jumping. Wear shoes you can swim in.', {
              ...cost('1500', 'PHP'),
              post: 'Fourteen jumps, the highest about eight metres. Water that blue the whole way down.',
            }),
            act('Late lunch at the third falls', '12:30', 'Kawasan Falls', null, cost('250', 'PHP')),
          ]),
          day('Moalboal, Cebu, Philippines', 'The sardine run', [
            act('Sardine run at Panagsama', '07:00', 'Panagsama Beach, Moalboal', 'Swim straight out about thirty metres.', {
              ...cost('0', 'PHP'),
              post: 'Swam out thirty metres and the water turned solid silver. Millions of them, moving like one thing.',
            }),
            act('Pescador Island dive', '10:00', 'Pescador Island', null, cost('2200', 'PHP')),
            act('Sunset at Basdaku', '17:30', 'Basdaku White Beach', 'The only west-facing beach on this side.', {
              ...cost('0', 'PHP'),
              post: 'Last night here. Bought a beer from a cooler on the sand and watched it go orange.',
            }),
          ]),
          day('Sirao Flower Garden, Cebu', 'Up into the hills', [
            act('Sirao Garden', '08:00', 'Sirao, Cebu City', 'A celosia farm, and it is very pink.', cost('100', 'PHP')),
            act('Temple of Leah', '11:00', 'Busay, Cebu City', 'Unfinished and strange. Worth it for the view back over the city.', cost('120', 'PHP')),
          ]),
          day('Cebu City, Philippines', 'City on the last day', [
            act('Magellan\'s Cross and Basilica', '09:00', 'Downtown Cebu City', null, cost('0', 'PHP')),
            act('Larsian barbecue', '19:00', 'Fuente Osmeña', 'Point at what you want, they grill it in front of you.', {
              ...cost('300', 'PHP'),
              post: 'Ended the trip at Larsian. Pointed at things until the table was full. Two hundred pesos each.',
            }),
          ]),
        ],
      },
      {
        title: 'Bali on a motorbike',
        destination: 'Bali',
        description: 'Ubud inland first, then south to the coast. Nine days, one helmet, no plan past day three.',
        standouts: ['Sidemen valley over Ubud, every time'],
        bestTimeOfYear: 'Apr – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Ubud, Bali, Indonesia', 'Ubud', [
            act('Tegallalang rice terraces', '07:00', 'Tegallalang, Ubud', 'Early or not at all.', {
              ...cost('50000', 'IDR'),
              post: 'Seven a.m. and the terraces had about four people on them. By nine there were coaches.',
            }),
            act('Campuhan Ridge walk', '16:30', 'Ubud', null, cost('0', 'IDR')),
          ]),
          day('Mount Batur, Bali', 'Sunrise hike', [
            act('Batur summit trek', '03:30', 'Kintamani, Bali', 'Pickup at half three. Cold at the top — bring a layer.', {
              ...cost('450000', 'IDR'),
              post: 'Two hours up in the dark with a torch. Sat on a volcano eating an egg boiled in steam from the ground.',
            }),
          ]),
          day('Sidemen, Bali, Indonesia', 'The valley', [
            act('Sidemen rice valley walk', '08:00', 'Sidemen, Karangasem', 'Ubud twenty years ago, is what everyone says. For once it is true.', {
              ...cost('0', 'IDR'),
              post: 'Skipped Ubud entirely on the way back and stayed here instead. No scooter noise, just water moving through the terraces.',
            }),
          ]),
          day('Uluwatu, Bali', 'South coast', [
            act('Uluwatu Temple at sunset', '17:00', 'Pecatu, Uluwatu', 'Watch the monkeys, they take sunglasses.', cost('50000', 'IDR')),
            act('Padang Padang beach', '10:00', 'Pecatu', null, cost('20000', 'IDR')),
          ]),
        ],
      },
      {
        title: 'Palawan: El Nido to Coron',
        destination: 'Palawan',
        description: 'The expedition boat between the two, four days at sea sleeping on beaches.',
        standouts: ['Sleeping on an island with no electricity', 'Kayangan Lake before the day boats arrive'],
        bestTimeOfYear: 'Nov – May',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('El Nido, Palawan, Philippines', 'El Nido', [
            act('Tour A — the lagoons', '08:30', 'Bacuit Bay, El Nido', 'Big Lagoon, Secret Lagoon, Shimizu. The standard one and still the best.', {
              ...cost('1400', 'PHP'),
              post: 'Paddled into Big Lagoon at the back of the group and the walls just kept going up.',
            }),
            act('Las Cabanas for sunset', '17:30', 'Las Cabanas Beach', null, cost('0', 'PHP')),
          ]),
          day('Coron, Palawan, Philippines', 'Coron', [
            act('Kayangan Lake', '06:30', 'Coron Island', 'First boat out. By ten there are two hundred people on that jetty.', {
              ...cost('300', 'PHP'),
              post: 'Climbed the steps at half six with nobody else on them. The lake was completely still.',
            }),
            act('Barracuda Lake', '09:00', 'Coron Island', 'Thermocline halfway down — the water goes from cold to hot in a metre.', cost('200', 'PHP')),
          ]),
          day('Culion, Palawan, Philippines', 'The quiet island', [
            act('Culion town and the old hospital', '10:00', 'Culion', 'Was a leper colony until 1980. The museum is small and worth an hour.', {
              ...cost('100', 'PHP'),
              post: 'Nobody comes here. Spent the afternoon on a bench above the harbour and saw two other tourists.',
            }),
          ]),
        ],
      },
      {
        title: 'Northern Vietnam, slowly',
        destination: 'Hanoi',
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
      {
        title: 'Thailand: islands and the north',
        destination: 'Chiang Mai',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Nov – Feb',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Chiang Mai, Thailand', 'Chiang Mai', [
            act('Doi Suthep at sunrise', '05:30', 'Doi Suthep, Chiang Mai', 'Three hundred steps up. Go before the tour vans.', {}),
            act('Sunday walking street', '17:00', 'Old City, Chiang Mai', null, {}),
          ]),
          day('Railay Beach, Krabi, Thailand', 'Railay', [
            act('Railay East to West walk', '09:00', 'Railay, Krabi', 'No roads here — boat access only.', {}),
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
        destination: 'Tokyo',
        description:
          'Two weeks in late October, which everyone told me was the right call. They were right. '
          + 'Trains for everything except Hakone.',
        standouts: ['Fuji clear for three straight days', 'Fushimi Inari at 6am, alone the whole way up'],
        bestTimeOfYear: 'Oct – Nov',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Mount Fuji, Japan', 'Fuji from Hakone', [
            act('Hakone Ropeway', '09:00', 'Hakone, Kanagawa', 'Owakudani side first — Fuji is behind you coming back.', {
              ...cost('2500', 'JPY'),
              post: 'Third clear day in a row. Locals in the car said that basically does not happen in October.',
            }),
            act('Lake Ashi pirate ship', '13:00', 'Lake Ashi, Hakone', 'Silly boat, correct view.', cost('1200', 'JPY')),
            act('Onsen at the ryokan', '18:00', 'Hakone-Yumoto', null, {}),
          ]),
          day('Kyoto, Japan', 'Kyoto, early', [
            act('Fushimi Inari before six', '05:45', 'Fushimi, Kyoto', 'The whole point is being alone on it. Six is already late.', {
              ...cost('0', 'JPY'),
              post: 'Quarter to six and I had the entire mountain. Ten thousand gates and nobody in them.',
            }),
            act('Nishiki Market', '11:00', 'Nakagyo, Kyoto', null, cost('2000', 'JPY')),
            act('Philosopher\'s Path', '16:00', 'Higashiyama, Kyoto', 'Two kilometres of canal. Do it slowly.', {
              ...cost('0', 'JPY'),
              post: 'Walked the whole canal at the wrong time of year for blossom and it was better for it. Empty.',
            }),
          ]),
          day('Arashiyama, Kyoto, Japan', 'West of the city', [
            act('Bamboo grove', '07:00', 'Arashiyama, Kyoto', null, cost('0', 'JPY')),
            act('Monkey park', '10:00', 'Arashiyama', 'Steep climb. The monkeys are at the top and unbothered.', cost('550', 'JPY')),
          ]),
          day('Osaka, Japan', 'Home ground', [
            act('Dotonbori at night', '19:00', 'Namba, Osaka', 'Loud, bright, exactly as advertised.', {
              ...cost('3000', 'JPY'),
              post: 'Home. Took the visitors to Dotonbori and remembered why I stopped going. Still ate everything.',
            }),
            act('Kuromon Ichiba', '10:00', 'Nipponbashi, Osaka', null, cost('2500', 'JPY')),
          ]),
        ],
      },
      {
        title: 'Seoul, five days',
        destination: 'Seoul',
        description: 'A long weekend that became five days because of a typhoon. No complaints.',
        standouts: ['Bukhansan on a clear morning'],
        bestTimeOfYear: 'Sep – Nov',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Seoul, South Korea', 'Palaces', [
            act('Gyeongbokgung', '09:00', 'Jongno, Seoul', 'Free entry in hanbok, which half the queue is wearing.', {
              ...cost('3000', 'KRW'),
              post: 'Changing of the guard at ten. Stayed for the whole thing, which I did not expect to.',
            }),
            act('Bukchon Hanok Village', '13:00', 'Jongno, Seoul', 'People live here. Keep it down.', cost('0', 'KRW')),
          ]),
          day('Bukhansan, South Korea', 'Up the mountain', [
            act('Bukhansan Baegundae peak', '07:00', 'Bukhansan National Park', 'Four hours return. Granite slabs near the top with chains.', {
              ...cost('0', 'KRW'),
              post: 'A national park inside a city of ten million. Granite, chains, and the skyline underneath you.',
            }),
          ]),
          day('Jeonju, South Korea', 'Day trip south', [
            act('Jeonju Hanok Village', '10:00', 'Jeonju, North Jeolla', 'Two hours by KTX. Go for the bibimbap, stay for the streets.', {
              ...cost('12000', 'KRW'),
              post: 'Came for one bowl of bibimbap and ended up staying till the last train.',
            }),
          ]),
        ],
      },
      {
        title: 'Hokkaido in deep winter',
        destination: 'Sapporo',
        description: 'February. Minus fifteen most days and the best snow I have stood in.',
        standouts: ['Otaru canal at night, under snow'],
        bestTimeOfYear: 'Jan – Feb',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Sapporo, Japan', 'Sapporo', [
            act('Snow Festival at Odori Park', '18:00', 'Odori Park, Sapporo', 'Go after dark, the carvings are lit.', {
              ...cost('0', 'JPY'),
              post: 'Ice buildings four storeys high, lit from inside, minus twelve. Lasted about ninety minutes outside.',
            }),
            act('Susukino ramen alley', '20:30', 'Susukino, Sapporo', 'Miso ramen is the local one. Queue at the small places.', cost('1200', 'JPY')),
          ]),
          day('Otaru, Japan', 'Otaru', [
            act('Otaru canal after dark', '17:30', 'Otaru, Hokkaido', 'Gas lamps and snow on the warehouses.', {
              ...cost('0', 'JPY'),
              post: 'Snowing hard on the canal with the old gas lamps on. Barely took my hands out of my pockets.',
            }),
          ]),
          day('Furano, Hokkaido, Japan', 'Powder', [
            act('Furano ski day', '08:30', 'Furano, Hokkaido', 'Drier snow than anywhere in Honshu.', cost('6200', 'JPY')),
          ]),
        ],
      },
      {
        title: 'Taipei, eating',
        destination: 'Taipei',
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
      {
        title: 'Hong Kong, three days',
        destination: 'Hong Kong',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Oct – Dec',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Hong Kong', 'Island side', [
            act('Victoria Peak, walking up', '07:00', 'Central, Hong Kong', 'The tram queue is an hour. The path is forty minutes.', {}),
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
        destination: 'Victoria',
        description: 'Four days from Torquay to Port Fairy. Everyone does it in one and misses the entire point.',
        standouts: ['Twelve Apostles at sunrise with nobody there', 'Otways rainforest in the rain, deliberately'],
        bestTimeOfYear: 'Nov – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Great Ocean Road, Australia', 'Torquay to Lorne', [
            act('Bells Beach', '08:00', 'Torquay, VIC', 'Watch from the platform, the path down is closed half the time.', cost('0', 'AUD')),
            act('Teddy\'s Lookout', '16:00', 'Lorne, VIC', 'The road-and-river shot people think is drone footage.', {
              ...cost('0', 'AUD'),
              post: 'Pulled in at Teddy\'s on a whim. That bend in the road with the river behind it — it is real and it is right there.',
            }),
          ]),
          day('Great Otway National Park, Australia', 'Into the Otways', [
            act('Triplet Falls loop', '09:00', 'Otway Ranges, VIC', 'Two kilometres, boardwalked, wet underfoot always.', {
              ...cost('0', 'AUD'),
              post: 'Rained the entire walk which is exactly what you want in the Otways. Everything dripping and green.',
            }),
            act('Cape Otway Lightstation', '13:00', 'Cape Otway, VIC', 'Koalas on the road in — drive slowly.', cost('20', 'AUD')),
          ]),
          day('Twelve Apostles, Australia', 'The limestone coast', [
            act('Twelve Apostles at sunrise', '05:45', 'Port Campbell NP, VIC', 'Gibson Steps first, then the boardwalk.', {
              ...cost('0', 'AUD'),
              post: 'Five forty-five and completely alone. Everyone comes at sunset for the light and misses this.',
            }),
            act('Loch Ard Gorge', '08:30', 'Port Campbell NP, VIC', null, cost('0', 'AUD')),
          ]),
          day('Port Fairy, Australia', 'The quiet end', [
            act('Griffiths Island walk', '08:00', 'Port Fairy, VIC', 'Shearwaters from September. Loop is an hour.', {
              ...cost('0', 'AUD'),
              post: 'Last morning. Walked the island loop and had it to myself apart from about nine thousand birds.',
            }),
          ]),
        ],
      },
      {
        title: 'South Island, two weeks',
        destination: 'Queenstown',
        description: 'Campervan. Rained six days out of fourteen and it was still the best trip I have done.',
        standouts: ['Milford Sound in heavy rain — every cliff becomes a waterfall'],
        bestTimeOfYear: 'Dec – Feb',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Milford Sound, New Zealand', 'Fiordland', [
            act('Milford Sound cruise', '10:00', 'Milford Sound, Fiordland', 'Go on a wet day. Genuinely better.', {
              ...cost('110', 'NZD'),
              post: 'Went out in heavy rain on purpose. Every cliff face turns into a waterfall — hundreds of them.',
            }),
            act('The drive in from Te Anau', '07:00', 'Milford Road, SI', 'Two hours, stop constantly.', cost('0', 'NZD')),
          ]),
          day('Lake Wanaka, New Zealand', 'Wanaka', [
            act('Roys Peak', '05:00', 'Wanaka, Otago', 'Six hours return, sixteen hundred metres up. Start in the dark.', {
              ...cost('0', 'NZD'),
              post: 'Three hours up in the dark to be on that ridge at sunrise. Legs gone. Worth it.',
            }),
            act('That Wanaka Tree', '19:30', 'Lake Wanaka', 'It is a tree in a lake and there will be nine people photographing it.', cost('0', 'NZD')),
          ]),
          day('Queenstown, New Zealand', 'Queenstown', [
            act('Ben Lomond track', '08:00', 'Queenstown, Otago', null, cost('0', 'NZD')),
            act('Fergburger, eventually', '21:00', 'Shotover St, Queenstown', 'The queue is forty minutes and yes it is worth it.', {
              ...cost('19', 'NZD'),
              post: 'Queued forty minutes for a burger like a tourist. Ate it on a wall by the lake. No regrets.',
            }),
          ]),
        ],
      },
      {
        title: 'Tasmania, east coast',
        destination: 'Hobart',
        description: 'Eight days. Colder than the mainland in every sense and I liked it more.',
        standouts: ['Wineglass Bay from the saddle, not the lookout'],
        bestTimeOfYear: 'Dec – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Freycinet National Park, Tasmania', 'Freycinet', [
            act('Wineglass Bay lookout and down', '07:30', 'Freycinet NP, TAS', 'Most people stop at the lookout. Keep going down to the sand.', {
              ...cost('40', 'AUD'),
              post: 'Everyone turns around at the lookout. Twenty more minutes down and the beach was empty.',
            }),
            act('Cape Tourville boardwalk', '17:00', 'Freycinet NP', 'Twenty minutes, flat, and the best light of the day.', cost('0', 'AUD')),
          ]),
          day('Hobart, Tasmania', 'Hobart', [
            act('Salamanca Market', '09:00', 'Salamanca Place, Hobart', 'Saturdays only.', {
              ...cost('30', 'AUD'),
              post: 'Saturday market, bought cheese I did not need and a scarf I did.',
            }),
            act('MONA, by ferry', '12:00', 'Berriedale, Hobart', 'Take the boat, not the car. The boat is part of it.', cost('38', 'AUD')),
          ]),
          day('Cradle Mountain, Tasmania', 'Cradle', [
            act('Dove Lake circuit', '08:00', 'Cradle Mountain NP', 'Six kilometres, boardwalked most of the way.', {
              ...cost('80', 'AUD'),
              post: 'Cloud came down halfway round and the whole lake vanished. Stood there ten minutes and it lifted again.',
            }),
          ]),
        ],
      },
      {
        title: 'Whitsundays, sailing',
        destination: 'Queensland',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Jun – Oct',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Whitsunday Islands, Australia', 'Out on the boat', [
            act('Whitehaven Beach', '10:00', 'Whitsunday Island, QLD', 'Silica sand — it squeaks and it does not hold heat.', {
              ...cost('0', 'AUD'),
              post: 'Sand so fine it squeaks underfoot and stays cool at midday. Nobody warned me about that.',
            }),
            act('Snorkelling at Blue Pearl Bay', '14:00', 'Hayman Island, QLD', null, cost('0', 'AUD')),
          ]),
          day('Great Barrier Reef, Australia', 'The reef', [
            act('Outer reef dive', '08:00', 'Hardy Reef, QLD', 'Two tanks. Visibility was thirty metres.', {
              ...cost('220', 'AUD'),
              post: 'Second tank on the outer reef. A turtle came up beside me and stayed for a minute and left.',
            }),
          ]),
        ],
      },
      {
        title: 'Western Australia, the long way',
        destination: 'Perth',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Sep – Nov',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Margaret River, Western Australia', 'South west', [
            act('Coastal drive to Cape Leeuwin', '09:00', 'Augusta, WA', 'Where two oceans meet, allegedly. Windy either way.', {}),
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
        destination: 'Lisbon',
        description: 'Ten days, all of it by train except Sintra, which is also by train but feels illegal.',
        standouts: ['Douro valley in September, during harvest'],
        bestTimeOfYear: 'Apr – Jun · Sep – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Lisbon, Portugal', 'Alfama and the hills', [
            act('Alfama, downhill from the castle', '09:30', 'Alfama, Lisbon', 'Start at the top. Every guide starts at the bottom and it is wrong.', {
              ...cost('0', 'EUR'),
              post: 'Started at the castle and fell downhill through Alfama for three hours. This is the correct direction.',
            }),
            act('Miradouro da Senhora do Monte', '18:30', 'Graça, Lisbon', 'The one with no tour buses.', cost('0', 'EUR')),
          ]),
          day('Sintra, Portugal', 'Sintra', [
            act('Pena Palace', '09:00', 'Sintra', 'First entry slot or do not bother.', cost('14', 'EUR')),
            act('Quinta da Regaleira', '13:00', 'Sintra', 'The inverted well. Go down it, not up.', {
              ...cost('12', 'EUR'),
              post: 'Went down the inverted well instead of up it. Spiral staircase into the ground, moss on everything.',
            }),
          ]),
          day('Porto, Portugal', 'Porto', [
            act('Livraria Lello', '09:30', 'Baixa, Porto', 'Timed ticket, redeemable against a book.', cost('8', 'EUR')),
            act('Port tasting in Gaia', '16:00', 'Vila Nova de Gaia', null, cost('25', 'EUR')),
            act('Sunset from Jardim do Morro', '19:00', 'Vila Nova de Gaia', 'Free, and better than any of the paid terraces.', {
              ...cost('0', 'EUR'),
              post: 'Two euros for a beer from the kiosk and the best view in Porto. The paid terraces are behind us and worse.',
            }),
          ]),
          day('Douro Valley, Portugal', 'The valley', [
            act('Train to Pinhão', '08:30', 'Porto São Bento', 'Sit on the right after Régua. The line runs along the river.', {
              ...cost('14', 'EUR'),
              post: 'Two hours with the window down, the line right on the water. Best train I have been on.',
            }),
            act('Quinta walk and lunch', '12:00', 'Pinhão, Douro', null, cost('45', 'EUR')),
          ]),
        ],
      },
      {
        title: 'The Basque coast',
        destination: 'San Sebastián',
        description: 'Six days of eating standing up. Train from Lisbon took two days and was half the fun.',
        standouts: ['Pintxos crawl in the old town, no reservations anywhere'],
        bestTimeOfYear: 'May – Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('San Sebastian, Spain', 'Donostia', [
            act('Pintxos crawl, Parte Vieja', '20:00', 'Parte Vieja, San Sebastián', 'One thing per bar, then move. Never sit down.', {
              ...cost('40', 'EUR'),
              post: 'Eleven bars, one pintxo each, standing the whole time. That is the rule and the rule is correct.',
            }),
            act('Monte Igueldo', '17:00', 'Igueldo, San Sebastián', 'Funicular from 1912, still running.', cost('4', 'EUR')),
          ]),
          day('Bilbao, Spain', 'Bilbao', [
            act('Guggenheim', '10:00', 'Abandoibarra, Bilbao', 'The building beats most of what is in it.', {
              ...cost('16', 'EUR'),
              post: 'Spent longer walking around the outside than inside. Titanium changes colour as the light moves.',
            }),
            act('Mercado de la Ribera', '13:30', 'Casco Viejo, Bilbao', null, cost('20', 'EUR')),
          ]),
        ],
      },
      {
        title: 'Ireland, the west',
        destination: 'Galway',
        description: 'Ferry and trains. Wet, obviously.',
        standouts: [],
        bestTimeOfYear: 'May – Sep',
        lifecycle: 'completed',
        publish: 'private',
        days: [
          day('Cliffs of Moher, Ireland', 'The cliffs', [
            act('Cliffs of Moher coastal walk', '08:00', 'Doolin, Co. Clare', 'Walk from Doolin rather than driving to the visitor centre.', {
              ...cost('0', 'EUR'),
              post: 'Walked in from Doolin, five miles along the top. Arrived at the visitor centre and it felt like cheating to be there.',
            }),
          ]),
          day('Connemara, Ireland', 'Connemara', [
            act('Kylemore Abbey', '11:00', 'Connemara, Co. Galway', null, cost('16', 'EUR')),
            act('Sky Road loop', '15:00', 'Clifden, Co. Galway', 'Sixteen kilometres. Do it anticlockwise.', {
              ...cost('0', 'EUR'),
              post: 'Rain for ten minutes, sun for ten minutes, all afternoon. Someone told me that is just Tuesday here.',
            }),
          ]),
        ],
      },
      {
        title: 'Swiss trains in winter',
        destination: 'Interlaken',
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
        destination: 'Amsterdam',
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
        destination: 'Naxos',
        description: 'Three islands in twelve days. Slow ferries on purpose — the fast ones have no deck.',
        standouts: ['Sarakiniko at first light, before anyone', 'Naxos for the food, not the beaches'],
        bestTimeOfYear: 'May – Jun · Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Naxos, Greece', 'Naxos', [
            act('Portara at sunset', '19:30', 'Chora, Naxos', 'Arrive an hour early for a spot on the marble.', {
              ...cost('0', 'EUR'),
              post: 'A marble doorway to a temple nobody finished, standing on its own since 530 BC. Sat on it till dark.',
            }),
            act('Halki and the old olive press', '11:00', 'Halki, Naxos', null, cost('5', 'EUR')),
          ]),
          day('Milos, Greece', 'Milos', [
            act('Sarakiniko at dawn', '06:00', 'Sarakiniko, Milos', 'White volcanic rock. Photographs like a moon.', {
              ...cost('0', 'EUR'),
              post: 'Six in the morning on white volcanic rock with nobody else awake. Does not look like earth.',
            }),
            act('Kleftiko by boat', '10:00', 'Kleftiko, Milos', 'Only reachable by sea. Full-day boat.', cost('65', 'EUR')),
          ]),
          day('Santorini, Greece', 'Santorini, briefly', [
            act('Oia, away from the main street', '17:00', 'Oia, Santorini', 'Walk north past the crowds. Same view, nobody in it.', {
              ...cost('0', 'EUR'),
              post: 'Everyone packs into two hundred metres of Oia. Walked ten minutes north and had the same sunset alone.',
            }),
            act('Ancient Thera', '09:00', 'Mesa Vouno, Santorini', 'Nobody goes and it is the best thing on the island.', cost('6', 'EUR')),
          ]),
        ],
      },
      {
        title: 'Croatia, Dubrovnik north',
        destination: 'Dubrovnik',
        description: null,
        standouts: [],
        bestTimeOfYear: 'May – Oct',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Dubrovnik, Croatia', 'The walls', [
            act('City walls at opening', '08:00', 'Old Town, Dubrovnik', 'Two hours, no shade, go at eight.', {
              ...cost('35', 'EUR'),
              post: 'Eight in the morning to beat the heat and the cruise crowd. Two hours all the way round.',
            }),
            act('Lokrum island', '13:00', 'Lokrum, Dubrovnik', null, cost('27', 'EUR')),
          ]),
          day('Hvar, Croatia', 'Hvar', [
            act('Pakleni Islands boat', '10:00', 'Hvar Town', null, {
              ...cost('40', 'EUR'),
              post: 'Hired a small boat with no roof and island-hopped until the light went.',
            }),
          ]),
          day('Split, Croatia', 'Split', [
            act('Diocletian\'s Palace at night', '21:00', 'Old Town, Split', 'People live inside the palace walls. It is a neighbourhood, not a ruin.', {
              ...cost('0', 'EUR'),
              post: 'A Roman palace with laundry hanging in it and bars in the basement. Best kind of ruin — an inhabited one.',
            }),
          ]),
        ],
      },
      {
        title: 'Sicily, a slow circle',
        destination: 'Palermo',
        description: 'Two weeks by train and bus. Etna was smoking the whole time.',
        standouts: ['Street food in Palermo, standing at the stall'],
        bestTimeOfYear: 'Apr – Jun · Sep – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Mount Etna, Sicily', 'Etna', [
            act('Etna south side, up to the craters', '08:00', 'Nicolosi, Catania', 'Cable car then a guide above 2,900m. Cold at the top in any month.', {
              ...cost('85', 'EUR'),
              post: 'Walked on ground that was lava eight years ago, still warm through the boots. It was smoking above us the whole time.',
            }),
          ]),
          day('Palermo, Sicily', 'Palermo', [
            act('Ballarò market', '09:00', 'Albergheria, Palermo', 'Loud. Go hungry.', {
              ...cost('15', 'EUR'),
              post: 'Ate standing up at four different stalls before ten a.m. Nobody here sits down for breakfast.',
            }),
            act('Cappella Palatina', '14:00', 'Palazzo dei Normanni, Palermo', 'Norman, Arab and Byzantine in one room.', cost('19', 'EUR')),
          ]),
          day('Taormina, Sicily', 'Taormina', [
            act('Teatro Antico', '08:30', 'Taormina, Messina', 'Greek theatre with Etna framed in the gap. Go first thing.', {
              ...cost('14', 'EUR'),
              post: 'A Greek theatre from the third century BC with a live volcano framed in the stage gap.',
            }),
          ]),
        ],
      },
      {
        title: 'The Turquoise Coast',
        destination: 'Fethiye',
        description: null,
        standouts: [],
        bestTimeOfYear: 'May – Oct',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Oludeniz, Turkey', 'The lagoon', [
            act('Blue Lagoon early swim', '07:00', 'Ölüdeniz, Muğla', 'Before the paragliders start landing on the beach.', {}),
          ]),
          day('Kas, Turkey', 'Kaş', [
            act('Sea kayak over Kekova', '09:00', 'Kekova, Antalya', 'Sunken Lycian city under the boat.', {}),
          ]),
        ],
      },
      {
        title: 'Malta, four days',
        destination: 'Valletta',
        description: null,
        standouts: [],
        bestTimeOfYear: null,
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Valletta, Malta', 'Valletta', [
            act('Upper Barrakka Gardens', '11:00', 'Valletta', 'Gun salute at noon.', {}),
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
        destination: 'El Chaltén',
        description: 'Three weeks, two countries, one border crossing that took six hours. Wind every single day.',
        standouts: ['Fitz Roy clear at sunrise — one morning in nine', 'The W trek, self-catered'],
        bestTimeOfYear: 'Nov – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Fitz Roy, Argentina', 'El Chaltén', [
            act('Laguna de los Tres', '04:00', 'El Chaltén, Santa Cruz', 'Ten hours return. Last kilometre is scree, in the dark.', {
              ...cost('0', 'ARS'),
              post: 'Nine days of cloud and then this. Left at four in the dark for the last scree section. Worth every hour.',
            }),
            act('Chorrillo del Salto', '16:00', 'El Chaltén', 'Easy hour. Good for a rest day.', cost('0', 'ARS')),
          ]),
          day('Perito Moreno Glacier, Argentina', 'The glacier', [
            act('Perito Moreno boardwalks', '09:00', 'Los Glaciares NP', 'Stay for the calving. Roughly hourly, and you feel it.', {
              ...cost('12000', 'ARS'),
              post: 'You hear it before you see it — a crack like artillery, then a tower of ice goes into the water.',
            }),
          ]),
          day('Torres del Paine, Chile', 'Into Chile', [
            act('Base de las Torres', '05:30', 'Torres del Paine NP', 'Nine hours. The last hour is boulders.', {
              ...cost('0', 'CLP'),
              post: 'Nine hours for twenty minutes at the base. The three towers came out of cloud for exactly that long.',
            }),
            act('Salto Grande', '15:00', 'Torres del Paine NP', null, cost('0', 'CLP')),
          ]),
        ],
      },
      {
        title: 'Peru: Cusco and the valley',
        destination: 'Cusco',
        description: null,
        standouts: ['Two days acclimatising in Cusco. Not optional.'],
        bestTimeOfYear: 'May – Sep',
        lifecycle: 'completed',
        publish: 'private',
        days: [
          day('Machu Picchu, Peru', 'Machu Picchu', [
            act('First entry, Circuit 2', '06:00', 'Machu Picchu, Cusco', 'Book sixty days out. Circuit decides what you see.', {
              ...cost('152', 'PEN'),
              post: 'Six a.m. entry with mist still in the valley. It burns off around eight and everything appears at once.',
            }),
            act('Huayna Picchu', '10:00', 'Machu Picchu', 'Separate ticket, separate queue, very steep.', cost('200', 'PEN')),
          ]),
          day('Rainbow Mountain, Peru', 'Vinicunca', [
            act('Vinicunca trek', '04:00', 'Cusipata, Cusco', 'Five thousand metres. Do not attempt on day one.', {
              ...cost('120', 'PEN'),
              post: 'Five thousand metres and I could feel every one of them. The colours are real, the altitude more so.',
            }),
          ]),
          day('Cusco, Peru', 'Cusco', [
            act('San Pedro market', '08:00', 'Cusco', null, cost('30', 'PEN')),
            act('Sacsayhuamán', '14:00', 'Cusco', 'Walk up from the plaza, it is closer than it looks.', {
              ...cost('70', 'PEN'),
              post: 'Stones the size of a car, cut so close you cannot get paper between them. Nobody is sure how.',
            }),
          ]),
        ],
      },
      {
        title: 'Colombia: coffee country',
        destination: 'Medellín',
        description: 'Ten days. Everyone warned me and everyone was wrong.',
        standouts: ['Cocora valley in the early cloud'],
        bestTimeOfYear: 'Dec – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Cocora Valley, Colombia', 'Wax palms', [
            act('Cocora valley loop', '07:00', 'Salento, Quindío', 'Five hours. Anticlockwise puts the palms at the end.', {
              ...cost('20000', 'COP'),
              post: 'Sixty-metre palm trees coming out of cloud on a hillside. They should not exist and there are hundreds.',
            }),
          ]),
          day('Medellin, Colombia', 'Medellín', [
            act('Comuna 13 walking tour', '10:00', 'Comuna 13, Medellín', 'Go with a local guide from the neighbourhood.', {
              ...cost('60000', 'COP'),
              post: 'Escalators up a hillside that used to be the most dangerous place in the country. Guide grew up on those steps.',
            }),
            act('Metrocable to Arví', '15:00', 'Santo Domingo, Medellín', 'Public transport that is also a cable car over the whole city.', cost('7000', 'COP')),
          ]),
        ],
      },
      {
        title: 'Atacama, five nights',
        destination: 'San Pedro de Atacama',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Mar – May · Sep – Nov',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Atacama Desert, Chile', 'The desert', [
            act('Valle de la Luna at sunset', '17:00', 'San Pedro de Atacama', null, {}),
            act('El Tatio geysers', '04:30', 'El Tatio, Antofagasta', 'Leave at half four. They only steam properly at dawn.', {}),
          ]),
        ],
      },
      {
        title: 'Rio, carnival week',
        destination: 'Rio de Janeiro',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Feb',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Rio de Janeiro, Brazil', 'Rio', [
            act('Sugarloaf at dusk', '17:30', 'Urca, Rio de Janeiro', 'Two cable cars. Go up for sunset, come down in the dark.', {}),
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
        destination: 'Reykjavík',
        description: 'Ten days clockwise in a van in September. Aurora on four nights.',
        standouts: ['Jökulsárlón and Diamond Beach on the same morning', 'Hot springs nobody signposts'],
        bestTimeOfYear: 'Jun – Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Skogafoss, Iceland', 'The south coast', [
            act('Seljalandsfoss, walk behind it', '08:00', 'Seljalandsfoss, South Iceland', 'You will get soaked.', {
              ...cost('800', 'ISK'),
              post: 'Walked behind the whole waterfall and came out the other side completely drenched. Do it anyway.',
            }),
            act('Skógafoss and the stairs', '10:30', 'Skógafoss', '370 steps up, and the trail keeps going for 20km.', cost('0', 'ISK')),
            act('Reynisfjara black sand', '15:00', 'Vík í Mýrdal', 'Sneaker waves kill people here. Stay well back.', {
              ...cost('0', 'ISK'),
              post: 'Black sand, basalt columns, and signs every fifty metres telling you people die here. Believed them.',
            }),
          ]),
          day('Jokulsarlon, Iceland', 'Glacier lagoon', [
            act('Jökulsárlón at sunrise', '07:00', 'Jökulsárlón, Southeast Iceland', null, {
              ...cost('0', 'ISK'),
              post: 'Icebergs calving off the glacier and drifting out to sea. Sat watching for two hours and lost track.',
            }),
            act('Diamond Beach', '09:00', 'Breiðamerkursandur', 'Same icebergs, washed up on black sand across the road.', cost('0', 'ISK')),
          ]),
          day('Northern Lights, Iceland', 'Aurora night', [
            act('Aurora watch from the van', '22:30', 'Höfn, Southeast Iceland', 'Check the KP index at dinner, then drive away from town.', {
              ...cost('0', 'ISK'),
              post: 'Fourth night in a row. You stop photographing it eventually and just lie on the roof.',
            }),
          ]),
        ],
      },
      {
        title: 'Utah, five parks',
        destination: 'Moab',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Apr – May · Sep – Oct',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Arches National Park, Utah', 'Arches', [
            act('Delicate Arch at sunset', '18:00', 'Arches NP, Moab', 'Three miles return, no shade, take two litres.', {
              ...cost('30', 'USD'),
              post: 'Thirty people sat in a natural amphitheatre watching one rock go orange. Worth the three miles.',
            }),
            act('Windows Section', '08:00', 'Arches NP', null, cost('0', 'USD')),
          ]),
          day('Bryce Canyon, Utah', 'Bryce', [
            act('Navajo Loop and Queens Garden', '07:00', 'Bryce Canyon NP', 'Down Navajo, up Queens. Not the other way.', {
              ...cost('35', 'USD'),
              post: 'Dropped into the hoodoos at seven with frost still on the switchbacks. Came up two hours later sweating.',
            }),
          ]),
          day('Zion National Park, Utah', 'Zion', [
            act('Angels Landing', '06:00', 'Zion NP', 'Permit by lottery. The chains are not for everyone.', {
              ...cost('35', 'USD'),
              post: 'Got the permit on the third try. The chains section is exactly as advertised. Did not look down much.',
            }),
            act('The Narrows, bottom-up', '13:00', 'Zion NP', 'Check the flash flood forecast. Not a suggestion.', cost('0', 'USD')),
          ]),
        ],
      },
      {
        title: 'Pacific Northwest loop',
        destination: 'Olympic',
        description: 'Van again. Rainforest, then a volcano, then the coast.',
        standouts: ['Hoh rainforest in fog'],
        bestTimeOfYear: 'Jul – Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Olympic National Park, Washington', 'Hoh and the coast', [
            act('Hall of Mosses', '08:00', 'Hoh Rainforest, WA', 'Under a mile. Rains 3.5 metres a year here.', {
              ...cost('30', 'USD'),
              post: 'Moss hanging off everything in sheets, fog in the canopy, no sound at all. Closest thing to a cathedral outdoors.',
            }),
            act('Rialto Beach and Hole-in-the-Wall', '16:00', 'La Push, WA', 'Time it with low tide or you cannot get through.', cost('0', 'USD')),
          ]),
          day('Mount Rainier, Washington', 'Rainier', [
            act('Skyline Trail from Paradise', '07:30', 'Paradise, Mount Rainier NP', 'Wildflowers late July. Snow patches into August.', {
              ...cost('30', 'USD'),
              post: 'Meadows full of flowers with a glaciated volcano behind them. Marmots everywhere, completely unbothered.',
            }),
          ]),
        ],
      },
      {
        title: 'Banff and the Icefields',
        destination: 'Banff',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Jun – Sep',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Moraine Lake, Alberta', 'Moraine and Louise', [
            act('Moraine Lake at sunrise', '05:00', 'Banff NP, AB', 'Shuttle only now. Book it weeks ahead.', {}),
          ]),
          day('Icefields Parkway, Canada', 'The parkway', [
            act('Peyto Lake viewpoint', '10:00', 'Icefields Parkway, AB', null, {}),
          ]),
        ],
      },
      {
        title: 'Baja, surfing south',
        destination: 'Baja California',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Oct – Apr',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Baja California, Mexico', 'Down the peninsula', [
            act('Todos Santos', '10:00', 'Todos Santos, BCS', null, {}),
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
        destination: 'Marrakech',
        description: 'Twelve days. Marrakech, over the Atlas, two nights in the dunes, then north to the blue city.',
        standouts: ['Erg Chebbi dunes at sunrise', 'Fes tanneries — hold the mint sprig they give you'],
        bestTimeOfYear: 'Mar – May · Sep – Nov',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Sahara Desert, Morocco', 'The dunes', [
            act('Camel out to camp', '17:00', 'Erg Chebbi, Merzouga', 'Ninety minutes. Uncomfortable and worth it.', {
              ...cost('600', 'MAD'),
              post: 'Ninety minutes on a camel to a camp with no electricity. Sky afterwards was absurd.',
            }),
            act('Dune sunrise', '06:00', 'Erg Chebbi', 'Climb the ridge behind camp in the dark.', {
              ...cost('0', 'MAD'),
              post: 'Climbed the ridge behind camp in the dark. Sand goes orange about ten minutes before the sun clears the horizon.',
            }),
          ]),
          day('Marrakech, Morocco', 'Marrakech', [
            act('Jemaa el-Fnaa after dark', '20:00', 'Medina, Marrakech', 'Chaotic. Agree prices before anything.', {
              ...cost('100', 'MAD'),
              post: 'The square empties at six and completely refills by eight as something else entirely. Ate at stall 31.',
            }),
            act('Le Jardin Secret', '10:00', 'Medina, Marrakech', 'Quiet, which the medina is not.', cost('80', 'MAD')),
          ]),
          day('Chefchaouen, Morocco', 'The blue city', [
            act('Medina, no map', '09:00', 'Chefchaouen, Rif', null, cost('0', 'MAD')),
            act('Spanish Mosque at sunset', '18:30', 'Chefchaouen', 'Thirty minutes up. The whole blue town below you.', {
              ...cost('0', 'MAD'),
              post: 'Half an hour uphill for the view back down. The blue goes further than you think from inside it.',
            }),
          ]),
        ],
      },
      {
        title: 'Namibia self-drive',
        destination: 'Sossusvlei',
        description: 'Two weeks, one 4x4, roof tent. Gravel roads the whole way.',
        standouts: ['Deadvlei at first light'],
        bestTimeOfYear: 'May – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Sossusvlei, Namibia', 'Dunes and dead trees', [
            act('Dune 45 sunrise', '06:00', 'Sossusvlei, Namib-Naukluft', null, cost('150', 'NAD')),
            act('Deadvlei walk', '08:00', 'Deadvlei', 'One kilometre over sand. Nine-hundred-year-old camelthorn trees.', {
              ...cost('0', 'NAD'),
              post: 'Black dead trees on white clay under orange dunes. Trees died nine hundred years ago and are still standing.',
            }),
          ]),
          day('Etosha National Park, Namibia', 'Waterholes', [
            act('Okaukuejo waterhole', '17:00', 'Etosha NP', 'Sit still and wait. Floodlit after dark.', {
              ...cost('80', 'NAD'),
              post: 'Sat at the waterhole from five until eleven at night. Rhino at nine, elephants at half ten.',
            }),
          ]),
          day('Swakopmund, Namibia', 'The coast', [
            act('Sandwich Harbour 4x4', '08:00', 'Walvis Bay, Namibia', 'Dunes running straight into the Atlantic. Tide-dependent.', {
              ...cost('1800', 'NAD'),
              post: 'Hundred-metre dunes dropping directly into the ocean. Driving on the beach between them at low tide.',
            }),
          ]),
        ],
      },
      {
        title: 'Tanzania: crater and coast',
        destination: 'Ngorongoro',
        description: null,
        standouts: ['The crater floor before the gate crowd descends'],
        bestTimeOfYear: 'Jun – Oct',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Ngorongoro Crater, Tanzania', 'The crater', [
            act('Crater floor game drive', '06:00', 'Ngorongoro Conservation Area', 'First vehicle down the descent road.', {
              ...cost('250', 'USD'),
              post: 'Down the crater wall at six with mist still in it. Twenty-five thousand animals live inside this bowl.',
            }),
          ]),
          day('Zanzibar, Tanzania', 'Stone Town', [
            act('Stone Town doors walk', '09:00', 'Stone Town, Zanzibar', 'The carved doors are the whole point.', {
              ...cost('0', 'TZS'),
              post: 'Spent a morning just photographing doors. Brass studs were an anti-elephant thing carried over from India.',
            }),
            act('Forodhani night market', '19:00', 'Forodhani Gardens', null, cost('15000', 'TZS')),
          ]),
        ],
      },
      {
        title: 'Cape Town and the Cape',
        destination: 'Cape Town',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Nov – Mar',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Table Mountain, South Africa', 'The mountain', [
            act('Platteklip Gorge up, cable car down', '06:30', 'Table Mountain NP', 'Two hours straight up. No shade at all.', {}),
          ]),
        ],
      },
      {
        title: 'Egypt, the Nile',
        destination: 'Luxor',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Oct – Apr',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Luxor, Egypt', 'West bank', [
            act('Valley of the Kings', '06:00', 'Luxor, Egypt', 'Three tombs on the standard ticket. Go at opening, it hits 40 by ten.', {}),
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
        destination: 'Kathmandu',
        description: 'Sixteen days including acclimatisation. Lukla flight both ways, which is its own event.',
        standouts: ['Kala Patthar at sunrise, 5,600m', 'Namche for two nights, not one'],
        bestTimeOfYear: 'Mar – May · Oct – Nov',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Mount Everest, Nepal', 'Base camp', [
            act('Gorak Shep to Base Camp', '07:00', 'Khumbu, Nepal', 'Three hours over moraine. The camp is on the glacier.', {
              ...cost('0', 'NPR'),
              post: 'Twelve days of walking to stand at a pile of rocks with prayer flags on it. Sat down and did not speak for a while.',
            }),
            act('Kala Patthar for sunrise', '04:30', 'Gorak Shep', 'Two hours in the dark at 5,600m.', {
              ...cost('0', 'NPR'),
              post: 'Minus twenty-something at 5,600 metres, two hours up in the dark. Everest goes gold first, then everything else.',
            }),
          ]),
          day('Namche Bazaar, Nepal', 'Acclimatising', [
            act('Everest View Hotel hike', '08:00', 'Namche Bazaar, Khumbu', 'Climb high, sleep low. This is the day that decides the trek.', {
              ...cost('0', 'NPR'),
              post: 'Rest day that is not a rest day. Four hundred metres up and back down to sleep. First sight of Everest from a terrace.',
            }),
            act('Sherpa Culture Museum', '14:00', 'Namche Bazaar', null, cost('100', 'NPR')),
          ]),
          day('Kathmandu, Nepal', 'Before and after', [
            act('Boudhanath at dusk', '17:30', 'Boudha, Kathmandu', 'Walk the kora clockwise with everyone else.', {
              ...cost('400', 'NPR'),
              post: 'Back down at 1,400 metres and the air feels like soup. Walked the kora three times with a hundred other people.',
            }),
            act('Thamel, gear shopping', '11:00', 'Thamel, Kathmandu', 'Rent the down jacket, do not buy one.', cost('2000', 'NPR')),
          ]),
        ],
      },
      {
        title: 'Sri Lanka by train',
        destination: 'Kandy',
        description: null,
        standouts: ['Kandy to Ella, second class, door open'],
        bestTimeOfYear: 'Dec – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Ella, Sri Lanka', 'Hill country', [
            act('Nine Arch Bridge', '06:30', 'Ella, Badulla', 'Trains at 6:20 and 9:20. Go for the early one.', {
              ...cost('0', 'LKR'),
              post: 'Waited for the 6:20 with about six other people. Tea plantation on both sides and a hundred-year-old bridge.',
            }),
            act('Little Adam\'s Peak', '16:00', 'Ella', 'Forty-five minutes up. Easy, and the best view here.', cost('0', 'LKR')),
          ]),
          day('Sigiriya, Sri Lanka', 'The rock', [
            act('Sigiriya Lion Rock', '07:00', 'Sigiriya, Central Province', '1,200 steps. Hornets on the way up in dry season.', {
              ...cost('30', 'USD'),
              post: 'Twelve hundred steps up a rock with a palace on top built in the fifth century. Started at seven to beat the heat and did not.',
            }),
          ]),
          day('Galle, Sri Lanka', 'The fort', [
            act('Galle Fort ramparts at sunset', '18:00', 'Galle Fort', null, {
              ...cost('0', 'LKR'),
              post: 'Walked the Dutch ramparts as the light went. Kids jumping off the wall into the sea the whole time.',
            }),
          ]),
        ],
      },
      {
        title: 'Kerala backwaters',
        destination: 'Kochi',
        description: 'A week at walking pace. Houseboat for two nights, which is one night too many.',
        standouts: [],
        bestTimeOfYear: 'Nov – Feb',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Kerala Backwaters, India', 'The backwaters', [
            act('Houseboat, Alleppey to Kumarakom', '12:00', 'Alappuzha, Kerala', 'One night is plenty. Two and you have seen it.', {
              ...cost('8000', 'INR'),
              post: 'Slow water, rice paddies either side, someone cooking fish at the back of the boat. Did nothing for eight hours.',
            }),
          ]),
          day('Kochi, India', 'Fort Kochi', [
            act('Chinese fishing nets at dawn', '06:00', 'Fort Kochi, Kerala', 'They still work them by hand.', {
              ...cost('0', 'INR'),
              post: 'Cantilevered nets the size of a house, worked by four men pulling on ropes, same as five hundred years ago.',
            }),
            act('Mattancherry and the spice market', '10:00', 'Mattancherry, Kochi', null, cost('0', 'INR')),
          ]),
        ],
      },
      {
        title: 'Rajasthan forts',
        destination: 'Jaipur',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Nov – Feb',
        lifecycle: 'ongoing',
        publish: null,
        days: [
          day('Jodhpur, India', 'The blue city', [
            act('Mehrangarh Fort', '09:00', 'Jodhpur, Rajasthan', 'Audio guide is included and actually good.', {
              ...cost('600', 'INR'),
              post: 'Fort on a cliff over a city painted entirely blue. Cannonball marks still in the gate from 1808.',
            }),
          ]),
          day('Udaipur, India', 'Lakes', [
            act('Lake Pichola at sunset', '18:00', 'Udaipur, Rajasthan', null, {}),
          ]),
        ],
      },
      {
        title: 'Bhutan, ten days',
        destination: 'Paro',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Mar – May · Sep – Nov',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Tigers Nest, Bhutan', 'Paro Taktsang', [
            act('Tiger\'s Nest monastery', '07:00', 'Paro Valley, Bhutan', 'Three hours up, hanging off a cliff at 3,100m.', {}),
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
        destination: 'Lofoten',
        description: 'Eight days of four-hour daylight and aurora most nights. Rented a cabin in Reine.',
        standouts: ['Reinebringen when the steps are clear of ice', 'Fishing village lights at 3pm dusk'],
        bestTimeOfYear: 'Feb – Mar · Jun – Aug',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Lofoten Islands, Norway', 'Reine and around', [
            act('Reinebringen sherpa steps', '10:00', 'Reine, Moskenes', '1,978 stone steps. Do not attempt iced without spikes.', {
              ...cost('0', 'NOK'),
              post: 'Nineteen hundred stone steps built by Nepali sherpas. Ice on the top third. The view is the whole archipelago.',
            }),
            act('Hamnøy bridge view', '14:00', 'Hamnøy, Lofoten', 'The red rorbuer shot. Ten metres from the road.', cost('0', 'NOK')),
          ]),
          day('Northern Lights, Norway', 'Aurora', [
            act('Aurora from Skagsanden beach', '21:00', 'Flakstad, Lofoten', 'Wide north-facing beach. Reflections in the wet sand.', {
              ...cost('0', 'NOK'),
              post: 'Green in the sky and green in the wet sand at the same time. Stood there until I could not feel my hands.',
            }),
          ]),
          day('Henningsvaer, Norway', 'The football pitch village', [
            act('Henningsvær harbour', '11:00', 'Henningsvær, Vågan', null, {
              ...cost('0', 'NOK'),
              post: 'A football pitch on a rock in the sea with drying racks all around it. Three hours of daylight to see it in.',
            }),
            act('Festvågtind hike', '08:00', 'Henningsvær', 'Steep, short, looks straight down on the village.', cost('0', 'NOK')),
          ]),
        ],
      },
      {
        title: 'Scottish Highlands',
        destination: 'Skye',
        description: null,
        standouts: ['Quiraing in cloud, which is most days'],
        bestTimeOfYear: 'May – Sep',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Isle of Skye, Scotland', 'Skye', [
            act('Quiraing loop', '08:00', 'Trotternish, Skye', 'Two hours. Boggy, and the path traverses a landslip.', {
              ...cost('0', 'GBP'),
              post: 'Cloud the whole way round, which everyone warns you about and which turns out to be the point.',
            }),
            act('Fairy Pools', '14:00', 'Glenbrittle, Skye', 'Cold enough to hurt. People swim anyway.', cost('6', 'GBP')),
          ]),
          day('Glencoe, Scotland', 'Glencoe', [
            act('Three Sisters viewpoint', '09:00', 'Glencoe, Highland', null, cost('0', 'GBP')),
            act('Lost Valley walk', '11:00', 'Glencoe', 'River crossing at the start. Wet feet guaranteed.', {
              ...cost('0', 'GBP'),
              post: 'Scrambled up into a hanging valley the MacDonalds hid stolen cattle in. Rained sideways the entire time.',
            }),
          ]),
        ],
      },
      {
        title: 'Finnish Lapland',
        destination: 'Rovaniemi',
        description: 'Deep January. Minus thirty one night, which I would not repeat.',
        standouts: ['Sleeping in a glass igloo, aurora directly overhead'],
        bestTimeOfYear: 'Dec – Mar',
        lifecycle: 'completed',
        publish: 'public',
        days: [
          day('Lapland, Finland', 'Above the circle', [
            act('Husky sledding, half day', '09:00', 'Rovaniemi, Lapland', 'You drive your own team. Brake is a metal bar you stand on.', {
              ...cost('180', 'EUR'),
              post: 'Driving your own team of six through forest at minus twenty, and the only sound is the runners on snow.',
            }),
            act('Glass igloo night', '21:00', 'Rovaniemi', 'Heated glass roof. Lie on your back and wait.', {
              ...cost('450', 'EUR'),
              post: 'Aurora directly overhead through a glass ceiling while warm in bed. Ridiculous and completely worth it.',
            }),
          ]),
          day('Inari, Finland', 'Sámi country', [
            act('Siida museum', '11:00', 'Inari, Lapland', 'Sámi-run. The best explanation of this region anywhere.', cost('15', 'EUR')),
          ]),
        ],
      },
      {
        title: 'Faroe Islands',
        destination: 'Tórshavn',
        description: null,
        standouts: [],
        bestTimeOfYear: 'May – Aug',
        lifecycle: 'upcoming',
        publish: null,
        days: [
          day('Faroe Islands, Denmark', 'Streymoy', [
            act('Sørvágsvatn, the lake above the ocean', '10:00', 'Vágar, Faroe Islands', 'Optical illusion only works from the far end.', {}),
            act('Gásadalur and Múlafossur', '15:00', 'Vágar', 'The waterfall off the cliff into the sea.', {}),
          ]),
        ],
      },
      {
        title: 'Svalbard, midnight sun',
        destination: 'Longyearbyen',
        description: null,
        standouts: [],
        bestTimeOfYear: 'Jun – Aug',
        lifecycle: 'draft',
        publish: null,
        days: [
          day('Svalbard, Norway', 'Longyearbyen', [
            act('Boat to Pyramiden', '08:00', 'Longyearbyen, Svalbard', 'Abandoned Soviet mining town. Guide carries a rifle, legally required.', {}),
          ]),
        ],
      },
    ],
  },
];


const DUMP_QUERIES = [
  'travel backpack road',
  'street food market asia',
  'mountain trail hikers',
  'ferry boat harbour',
  'campfire evening friends',
  'passport map planning',
];


const { SPECS, buildTrip } = require('./discoveryTrips');

for (const spec of SPECS) {
  const traveler = TRAVELERS.find((one) => one.tag === spec.owner);
  if (traveler === undefined) {
    throw new Error(`discovery trip "${spec.title}" names unknown traveler ${spec.owner}`);
  }
  traveler.trips.push(buildTrip(spec));
}

const titles = TRAVELERS.flatMap((one) => one.trips.map((trip) => trip.title));
if (new Set(titles).size !== titles.length) {
  const seen = new Set();
  const clash = titles.find((title) => seen.size === seen.add(title).size);
  throw new Error(`two trips share the title "${clash}" — the seeder and backdater both match on it`);
}

module.exports = { TRAVELERS, DUMP_QUERIES };
