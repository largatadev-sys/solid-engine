const TRIP = {
  title: 'Sydney & the South Coast',
  destinations: ['Sydney', 'Blue Mountains', 'Jervis Bay'],
  description:
    'Two weeks that turned into ten days once we worked out how far things actually are. '
    + 'City first, then west into the mountains, then south along the coast until the road ran out.',
  standouts: [
    'The Bondi to Coogee walk at sunrise, before the crowds',
    'Wentworth Falls from the bottom, not the lookout',
    'Hyams Beach on a weekday — genuinely empty',
  ],
  bestTimeOfYear: 'Oct – Apr',
  days: [
    {
      title: 'Landing in Sydney',
      activities: [
        {
          title: 'Circular Quay and the Opera House',
          timeOfDay: '09:30',
          place: 'Circular Quay, Sydney NSW',
          notes: 'Walk the western boardwalk for the shot everyone wants. Free.',
          photoQuery: 'sydney opera house harbour',
        },
        {
          title: 'Royal Botanic Garden',
          timeOfDay: '11:30',
          place: 'Royal Botanic Garden Sydney',
          costAmount: '0',
          costCurrency: 'AUD',
          notes: 'Mrs Macquarie\'s Chair at the far end looks back at the bridge and the house together.',
          photoQuery: 'royal botanic garden sydney',
        },
        {
          title: 'Ferry to Manly',
          timeOfDay: '15:00',
          place: 'Circular Quay Wharf 3',
          costAmount: '11',
          costCurrency: 'AUD',
          notes: 'The cheapest harbour cruise in the city. Sit outside on the left going out.',
          photoQuery: 'manly ferry sydney harbour',
        },
      ],
    },
    {
      title: 'The coastal walk',
      activities: [
        {
          title: 'Bondi to Coogee clifftop walk',
          timeOfDay: '06:30',
          place: 'Bondi Beach, NSW',
          notes: 'Six kilometres, about two hours with stops. Start early — no shade after nine.',
          photoQuery: 'bondi beach coastal walk',
        },
        {
          title: 'Breakfast at Gould Street',
          timeOfDay: '09:00',
          place: 'Gould St, Bondi Beach',
          costAmount: '32',
          costCurrency: 'AUD',
          photoQuery: 'bondi cafe breakfast',
        },
        {
          title: 'Wylie\'s Baths',
          timeOfDay: '11:30',
          place: 'Coogee, NSW',
          costAmount: '6',
          costCurrency: 'AUD',
          notes: 'Ocean pool built into the rocks. Bring a towel, there is nowhere to buy one.',
          photoQuery: 'coogee ocean pool',
        },
      ],
    },
    {
      title: 'West to the Blue Mountains',
      activities: [
        {
          title: 'Three Sisters from Echo Point',
          timeOfDay: '08:30',
          place: 'Echo Point, Katoomba NSW',
          notes: 'Arrive before the coaches. The Giant Stairway starts here if you want the valley floor.',
          photoQuery: 'three sisters blue mountains katoomba',
        },
        {
          title: 'Wentworth Falls track',
          timeOfDay: '10:30',
          place: 'Wentworth Falls, NSW',
          notes: 'Do it bottom-up. The lookout is the postcard; the base is the reason.',
          photoQuery: 'wentworth falls blue mountains',
        },
        {
          title: 'Scenic World',
          timeOfDay: '14:00',
          place: 'Katoomba, NSW',
          costAmount: '52',
          costCurrency: 'AUD',
          bookingPurpose: 'Day pass',
          bookingProvider: 'Scenic World',
          bookingPriceAmount: '52',
          bookingPriceCurrency: 'AUD',
          photoQuery: 'scenic world katoomba railway',
        },
      ],
    },
    {
      title: 'South to Jervis Bay',
      activities: [
        {
          title: 'Drive down the Princes Highway',
          timeOfDay: '08:00',
          place: 'Princes Hwy, NSW',
          notes: 'Three hours if you do not stop. Stop.',
          photoQuery: 'new south wales coastal road',
        },
        {
          title: 'Hyams Beach',
          timeOfDay: '12:00',
          place: 'Hyams Beach, Jervis Bay NSW',
          notes: 'The sand really is that white. Parking fills by ten on weekends.',
          photoQuery: 'hyams beach jervis bay white sand',
        },
        {
          title: 'Booderee National Park',
          timeOfDay: '15:00',
          place: 'Booderee National Park, NSW',
          costAmount: '13',
          costCurrency: 'AUD',
          notes: 'Vehicle entry, cash or card at the gate. Cave Beach is the quiet one.',
          photoQuery: 'booderee national park jervis bay',
        },
      ],
    },
    {
      title: 'Back up the coast',
      activities: [
        {
          title: 'Sea Cliff Bridge',
          timeOfDay: '10:00',
          place: 'Grand Pacific Drive, Clifton NSW',
          notes: 'Park at the northern end and walk out onto it.',
          photoQuery: 'sea cliff bridge grand pacific drive',
        },
        {
          title: 'Fish and chips at Wollongong Harbour',
          timeOfDay: '13:00',
          place: 'Wollongong Harbour, NSW',
          costAmount: '28',
          costCurrency: 'AUD',
          photoQuery: 'wollongong harbour lighthouse',
        },
      ],
    },
  ],
};


const DUMP_QUERIES = [
  'sydney harbour bridge evening',
  'australian eucalyptus forest',
  'kangaroo australia coast',
  'jervis bay dolphins',
  'australian surf beach sunset',
  'katoomba valley mist',
];


const POSTCARDS = [
  {
    day: 1,
    activity: 'Circular Quay and the Opera House',
    caption:
      'Landed at six, dropped the bags, walked straight down to the water. '
      + 'Everyone says the Opera House is smaller than you expect. It is not.',
  },
  {
    day: 2,
    activity: 'Bondi to Coogee clifftop walk',
    caption:
      'Up at half five for this and worth every minute — had the whole clifftop to ourselves '
      + 'until Tamarama. Six kilometres and about four hundred photos.',
  },
  {
    day: 3,
    activity: 'Wentworth Falls track',
    caption: 'Went down to the base instead of stopping at the lookout. Different waterfall entirely.',
  },
  {
    day: 4,
    activity: 'Hyams Beach',
    caption: 'Empty. On a Tuesday in October. Sand so white it hurt to look at.',
  },
];


module.exports = { TRIP, DUMP_QUERIES, POSTCARDS };
