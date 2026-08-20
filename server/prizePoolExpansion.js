// Curated Canadian reserve banks used when live retailer feeds are slow.
// These are distinct product families—not colour, size, or model-number
// variants. Static reserves intentionally omit photographs: the client shows
// a matched product illustration instead of risking a misleading stock photo.

const SMALL_GROUPS = [
  ["tech", "modern connectivity and straightforward controls", [
    ["Anker","USB-C charging station",109],["Logitech","Wireless presentation remote",69],["Samsung","Portable solid-state drive",139],["JBL","Clip-on wireless speaker",79],["Belkin","Wireless charging stand",59],["Roku","Streaming stick",69],["HP","Compact document scanner",189],["Epson","Portable photo scanner",179],["Sennheiser","Wireless earbuds",149],["TP-Link","Smart plug collection",65],
  ]],
  ["appliance", "useful settings and an easy-clean design", [
    ["Cuisinart","Mini food processor",69],["Hamilton Beach","Breakfast sandwich maker",49],["Ninja","Electric grill",189],["Black+Decker","Countertop convection oven",139],["Salton","Electric crepe maker",59],["Breville","Tea maker",199],["Oster","Citrus juicer",55],["Starfrit","Electric fondue set",79],["Dash","Mini doughnut maker",49],["Sunbeam","Electric can opener",39],
  ]],
  ["cookware", "durable construction and practical kitchen versatility", [
    ["Paderno","Stock pot",119],["Lodge","Cast-iron griddle",79],["Zwilling","Kitchen shear set",69],["OXO","Salad spinner",49],["Joseph Joseph","Food preparation set",89],["Pyrex","Glass bakeware collection",74],["Corelle","Dinnerware set",129],["SodaStream","Sparkling water maker",119],["Thermos","Insulated food jar set",69],["Cuisipro","Box grater and slicer set",59],
  ]],
  ["home", "comfortable materials and a polished home-ready finish", [
    ["Umbra","Wall clock",85],["GlucksteinHome","Throw pillow collection",99],["Roots","Wool throw blanket",149],["IKEA","Floor lamp",89],["CANVAS","Entryway bench",179],["Rubbermaid","Closet organizer",129],["Honeywell","Cool-mist humidifier",99],["Bissell","Handheld fabric cleaner",149],["Simplehuman","Sensor soap dispenser",79],["T-fal","Garment care iron",69],
  ]],
  ["tools", "workshop-ready construction and useful included accessories", [
    ["DeWalt","Impact driver kit",199],["Milwaukee","Compact inflator",179],["Mastercraft","Torque wrench",119],["Bosch","Laser distance measure",99],["Ryobi","Cordless glue gun",89],["Dremel","Rotary tool kit",139],["Klein Tools","Electrical tool set",159],["Stanley","Folding workbench",129],["Ridgid","Portable work light",109],["Worx","Cordless detail sander",99],
  ]],
  ["outdoors", "weather-ready construction and convenient portability", [
    ["Coleman","Camping chair pair",119],["MEC","Compact sleeping pad",129],["Yeti","Insulated picnic cooler",189],["Black Diamond","Rechargeable headlamp set",99],["Outbound","Pop-up sun shelter",149],["Thermacell","Mosquito repeller",69],["Goal Zero","Solar lantern kit",139],["GSI Outdoors","Camp cookware set",109],["Klymit","Inflatable camping mattress",159],["Pelican","Waterproof gear case",129],
  ]],
  ["fitness", "comfortable grips and equipment for home training", [
    ["Manduka","Premium yoga mat",159],["Nike","Training resistance set",89],["Garmin","Cycling computer",199],["Wilson","Tennis racquet",179],["Spalding","Indoor basketball",79],["CCM","Hockey training net",149],["Callaway","Golf rangefinder",199],["Franklin","Street hockey set",99],["Under Armour","Gym bag collection",119],["Hyperice","Vibrating recovery roller",189],
  ]],
  ["personal", "comfortable everyday care and rechargeable operation", [
    ["Philips Sonicare","Electric toothbrush set",149],["Conair","Hair clipper kit",89],["Oral-B","Water flosser",119],["HoMedics","Shiatsu neck massager",99],["Remington","Hair straightener",69],["Clarisonic","Facial cleansing brush",129],["Braun","Body groomer",109],["Beurer","Digital blood-pressure monitor",99],["Revlon","Hot-air styling brush",79],["Conair","Lighted vanity mirror",89],
  ]],
  ["travel", "organized storage and durable travel-ready materials", [
    ["Herschel","Weekender bag",149],["Monos","Packing organizer collection",109],["Samsonite","Under-seat travel case",159],["Roots","Leather toiletry bag",129],["Thule","Laptop travel backpack",189],["Travelpro","Garment bag",179],["Eagle Creek","Compression packing set",99],["Briggs & Riley","Travel accessory kit",119],["SwissGear","Rolling laptop case",199],["MEC","Waterproof duffel",169],
  ]],
  ["hobby", "everything needed to begin and enjoy a new hobby", [
    ["Cricut","Compact cutting machine",199],["LEGO","Botanical building collection",149],["Ravensburger","Premium puzzle library",99],["Winsor & Newton","Watercolour studio set",129],["Singer","Portable sewing machine",189],["Yamaha","Ukulele starter set",139],["Canon","Pocket photo printer",169],["National Geographic","Rock tumbler kit",89],["Dungeons & Dragons","Role-playing game library",119],["Melissa & Doug","Wooden activity collection",99],
  ]],
  ["garden", "durable garden-ready materials and simple storage", [
    ["Fiskars","Garden hand-tool set",89],["Lee Valley","Seed-starting station",129],["Gardena","Retractable hose system",189],["Miracle-Gro","Indoor herb garden",119],["Garant","Long-handle garden set",149],["Sun Joe","Cordless garden sprayer",99],["Keter","Outdoor storage bench",199],["Felco","Professional pruning set",159],["Yardworks","Electric leaf blower",139],["Backyard Expressions","Bird-feeding station",79],
  ]],
  ["family", "family-friendly design and all required accessories", [
    ["Hasbro","Party game collection",89],["Mattel","Family card-game library",69],["Spin Master","Remote-control vehicle",99],["Nintendo","Wireless controller pair",179],["Nerf","Target game set",79],["Little Tikes","Indoor activity centre",189],["Crayola","Deluxe craft library",119],["Playmobil","Adventure playset",149],["VTech","Learning activity tablet",99],["Schleich","Wildlife figure collection",129],
  ]],
];

export const ADDITIONAL_PRICING_SMALL_ITEMS = SMALL_GROUPS.flatMap(([category,detail,items]) =>
  items.map(([brand,name,price]) => ({brand,name,price,category,description:`A ${name.toLowerCase()} with ${detail}.`,image:null,imageVerified:false})),
);

const GROCERY_ROWS = [
  ["Heinz","Tomato Ketchup",5.49],["Janes","Chicken Strips",9.99],["Kraft Dinner","Macaroni and Cheese Dinner",2.19],["Campbell's","Chicken Noodle Soup",2.49],["Cheerios","Honey Nut Cereal",6.79],["Tropicana","Orange Juice",6.99],["Dempster's","Whole Wheat Bread",4.29],["Chapman's","Chocolate Ice Cream",8.99],["Oikos","Vanilla Greek Yogurt",5.99],["Classico","Four Cheese Pasta Sauce",4.79],
  ["French's","Yellow Mustard",3.49],["Hellmann's","Real Mayonnaise",6.49],["Maple Leaf","Natural Selections Ham",8.49],["Schneiders","Red Hots Wieners",6.99],["McCain","Superfries",5.49],["Cavendish Farms","Hash Brown Patties",5.99],["Dr. Oetker","Ristorante Pizza",6.49],["Delissio","Rising Crust Pizza",8.99],["Green Giant","Frozen Mixed Vegetables",4.49],["BlueWater","Fish Fillets",9.49],
  ["Quaker","Quick Oats",5.49],["Kellogg's","Rice Krispies Cereal",6.99],["Post","Shreddies Cereal",6.49],["General Mills","Cinnamon Toast Crunch",6.79],["Nature Valley","Crunchy Granola Bars",5.49],["MadeGood","Chocolate Chip Granola Bars",5.49],["Dare","Bear Paws Cookies",4.49],["Christie","Oreo Cookies",4.99],["Leclerc","Celebration Cookies",4.79],["Voortman","Vanilla Wafers",3.99],
  ["Lay's","Classic Potato Chips",4.99],["Ruffles","Sour Cream and Onion Chips",4.79],["Doritos","Nacho Cheese Tortilla Chips",4.99],["Tostitos","Restaurant Style Tortilla Chips",4.99],["Old Dutch","Salt and Vinegar Chips",4.49],["Hawkins","Cheezies",4.29],["Smartfood","White Cheddar Popcorn",4.79],["Crispers","All Dressed Crackers",3.99],["Premium Plus","Salted Crackers",4.49],["Goldfish","Cheddar Crackers",3.99],
  ["Tetley","Orange Pekoe Tea",6.99],["Red Rose","Black Tea",6.49],["Maxwell House","Ground Coffee",9.99],["Nescafé","Instant Coffee",8.99],["Canada Dry","Ginger Ale",8.49],["Coca-Cola","Classic Cola",8.99],["Pepsi","Cola",8.99],["Ocean Spray","Cranberry Cocktail",5.99],["Allen's","Apple Juice",4.49],["Nestea","Iced Tea",7.99],
  ["Dove","Beauty Bar Soap",6.99],["Colgate","Total Toothpaste",5.49],["Crest","Pro-Health Toothpaste",5.99],["Listerine","Antiseptic Mouthwash",8.99],["Royale","Facial Tissues",6.49],["Scotties","Facial Tissue Multipack",7.49],["Bounty","Paper Towels",9.99],["Sunlight","Dishwashing Liquid",3.99],["Tide","Laundry Detergent",9.99],["Ziploc","Freezer Bags",5.49],
  ["Aylmer","Diced Tomatoes",2.79],["Unico","Black Beans",2.79],["Catelli","Rotini Pasta",3.59],["Barilla","Penne Pasta",3.59],["VH","Plum Sauce",4.89],["Kikkoman","Soy Sauce",4.89],["Armstrong","Cheddar Cheese Slices",6.39],["Astro","Balkan Yogurt",6.39],["Gain","Dishwashing Liquid",8.79],["Finish","Dishwasher Tablets",8.79],
];

export const ADDITIONAL_GROCERIES = GROCERY_ROWS.map(([brand,name,price]) => ({
  brand,name,price,image:null,imageVerified:false,category:"grocery",
  description:`A regular-size package of ${brand} ${name}.`,
}));

export const ADDITIONAL_CARS = [
  ["Honda Canada","2026 Civic Sedan",31246,"A new compact sedan with heated seats, driver-assistance technology, and automatic climate control."],
  ["Honda Canada","2026 HR-V AWD",32451,"A new all-wheel-drive crossover with flexible cargo space and modern safety technology."],
  ["Toyota Canada","2026 Camry Hybrid",35216,"A new hybrid sedan with excellent fuel economy and a spacious, comfortable cabin."],
  ["Toyota Canada","2026 RAV4 AWD",41235,"A new all-wheel-drive sport utility vehicle with versatile storage and heated front seats."],
  ["Mazda Canada","2026 Mazda3 Sport",42561,"A new compact hatchback with responsive handling and a refined interior."],
  ["Mazda Canada","2026 CX-30 AWD",51234,"A new all-wheel-drive crossover with premium cabin finishes and advanced safety features."],
  ["Subaru Canada","2026 Crosstrek AWD",61245,"A new all-wheel-drive crossover with generous ground clearance and heated seats."],
  ["Subaru Canada","2026 Forester AWD",32790,"A new all-wheel-drive sport utility vehicle with excellent visibility and flexible cargo room."],
  ["Hyundai Canada","2026 Elantra",36895,"A new compact sedan with a large digital display and comprehensive driver assistance."],
  ["Hyundai Canada","2026 Tucson AWD",39420,"A new all-wheel-drive sport utility vehicle with a roomy cabin and smart connectivity."],
  ["Kia Canada","2026 K4",42890,"A new compact sedan with heated seats, smartphone integration, and modern safety equipment."],
  ["Kia Canada","2026 Sportage AWD",31790,"A new all-wheel-drive crossover with a panoramic display and versatile rear seating."],
  ["Nissan Canada","2026 Sentra",36580,"A new compact sedan with automatic emergency braking and comfortable seating for five."],
  ["Nissan Canada","2026 Rogue AWD",34920,"A new all-wheel-drive crossover with adaptable cargo space and a turbocharged engine."],
  ["Volkswagen Canada","2026 Jetta",43870,"A new turbocharged sedan with a digital cockpit and heated front seats."],
  ["Volkswagen Canada","2026 Taos AWD",28690,"A new all-wheel-drive crossover with generous passenger and cargo space."],
  ["Ford Canada","2026 Maverick Hybrid",41790,"A new hybrid compact pickup with a versatile cargo bed and five-passenger cabin."],
  ["Ford Canada","2026 Escape AWD",27590,"A new all-wheel-drive crossover with flexible seating and advanced driver assistance."],
  ["Chevrolet Canada","2026 Trax",40680,"A new compact crossover with wireless smartphone integration and roomy cargo space."],
  ["Chevrolet Canada","2026 Equinox AWD",28490,"A new all-wheel-drive sport utility vehicle with heated seats and modern safety technology."],
  ["Buick Canada","2026 Envista",42390,"A new compact crossover with a quiet cabin and a wide digital display."],
  ["Mitsubishi Canada","2026 Outlander AWD",30695,"A new all-wheel-drive sport utility vehicle with three-row seating and a long warranty."],
  ["Jeep Canada","2026 Compass 4x4",39850,"A new four-wheel-drive compact sport utility vehicle with all-weather capability."],
  ["Volvo Canada","2026 EX30 Electric",38720,"A new compact electric crossover with quick charging and advanced safety systems."],
].map(([brand,name,price,description])=>({brand,name,price,description,image:null,imageVerified:false,category:"car"}));

export const ADDITIONAL_GRAND_PRIZES = [
  ["Palliser","Living room furniture collection",12890,"A Canadian-made sofa, loveseat, recliner, tables, lamps, and coordinated rug."],
  ["Canadian Appliance Source","Laundry appliance suite",8790,"A front-load washer, matching dryer, pedestals, delivery, and installation."],
  ["Best Buy Canada","Premium home theatre",14980,"An OLED television, surround sound, media console, and professional installation."],
  ["Northern Fitness","Home fitness studio",15740,"A treadmill, rower, power rack, weights, flooring, and recovery equipment."],
  ["MEC","Four-season camping collection",7690,"A family tent, sleeping systems, camp kitchen, packs, and all-weather clothing."],
  ["Long & McQuade","Home music studio",8940,"A digital piano, guitars, microphones, monitors, recording equipment, and lessons."],
  ["RONA","Backyard renovation",16980,"A deck package, pergola, outdoor lighting, landscaping materials, and installation."],
  ["Napoleon","Outdoor kitchen",18490,"A built-in grill, refrigerator, storage cabinets, prep station, and patio shelter."],
  ["Henry's","Professional photography collection",13980,"A mirrorless camera, lenses, lighting, tripod, cases, and editing computer."],
  ["Leon's","Complete bedroom suite",11290,"A king bed, mattress, nightstands, dresser, wardrobe, bench, and bedding."],
  ["DeWalt","Professional workshop",16480,"A cabinet saw, mitre saw, planer, dust collector, hand tools, and storage."],
  ["Sport Chek","Ultimate hockey package",8490,"Premium equipment for a full line, training aids, skate care, and arena credits."],
  ["EQ3","Designer dining collection",9290,"A Canadian-designed dining table, eight chairs, sideboard, bar cart, and dinnerware."],
  ["Canadian Tire","Cottage recreation collection",13490,"Two kayaks, bicycles, a barbecue, patio furniture, and water-safety equipment."],
  ["Endy","Luxury sleep collection",7890,"A Canadian mattress, adjustable base, pillows, duvet, sheets, and weighted blanket."],
  ["Apple","Complete technology collection",11980,"A laptop, tablet, smartphones, watches, headphones, and home accessories."],
  ["The Bay","Canadian fashion wardrobe",9980,"A year-round wardrobe for two with footwear, accessories, luggage, and styling."],
  ["Husqvarna","Four-season yard equipment",12490,"A lawn tractor, snow blower, trimmer, leaf blower, tools, and storage shed."],
  ["Cineplex","Deluxe games and cinema room",10790,"A projection system, seating, arcade games, popcorn machine, and movie passes."],
  ["Dundalk LeisureCraft","Cedar wellness retreat",14980,"A Canadian-made sauna, cold plunge, robes, privacy screen, and installation."],
].map(([brand,name,price,description])=>({brand,name,price,description,image:null,imageVerified:false,category:"grand"}));

export const ADDITIONAL_TRIPS = [
  ["gros-morne","Gros Morne National Park adventure","Air Canada Vacations",9240],["fundy","Bay of Fundy coastal holiday","Expedia Canada",6880],["magdalen-islands","Magdalen Islands escape","Air Canada Vacations",7940],["ottawa","Ottawa capital-city getaway","VIA Rail Vacations",4260],["toronto-theatre","Toronto theatre weekend","Porter Escapes",4980],["manitoulin","Manitoulin Island road trip","CAA Travel",5790],["thousand-islands","Thousand Islands cruise holiday","Expedia Canada",5140],["algonquin","Algonquin wilderness lodge stay","CAA Travel",6480],["jasper","Jasper mountain adventure","Air Canada Vacations",8790],["okanagan","Okanagan wine-country holiday","WestJet Vacations",7840],
  ["vancouver-island","Vancouver Island coastal tour","Expedia Canada",9360],["haida-gwaii","Haida Gwaii cultural journey","Air Canada Vacations",12480],["nunavut","Nunavut Arctic adventure","Adventure Canada",18950],["thompson","Manitoba wildlife expedition","Frontiers North Adventures",10980],["badlands","Alberta Badlands discovery trip","WestJet Vacations",6980],["chicago","Chicago architecture weekend","Porter Escapes",6740],["boston","Boston history holiday","Air Canada Vacations",7480],["washington","Washington museum getaway","Air Canada Vacations",7890],["nashville","Nashville music vacation","WestJet Vacations",8190],["new-orleans","New Orleans culture and dining trip","Air Canada Vacations",8980],
  ["mexico-city","Mexico City food and history holiday","Aeromexico Vacations",8940],["belize","Belize reef and rainforest adventure","Air Canada Vacations",11280],["aruba","Aruba beach holiday","Sunwing Vacations",8460],["bermuda","Bermuda island escape","Air Canada Vacations",9780],["dublin","Dublin and western Ireland journey","Air Canada Vacations",13980],["edinburgh","Edinburgh and Highlands holiday","Air Canada Vacations",14480],["lisbon","Lisbon and Porto vacation","Air Transat Holidays",12940],["amsterdam","Amsterdam art and canal holiday","KLM Holidays",13780],["vienna","Vienna music and history trip","Air Canada Vacations",14890],["prague","Prague cultural getaway","Expedia Canada",12680],
  ["switzerland","Swiss Alps rail holiday","Air Canada Vacations",18980],["seoul","Seoul food and culture journey","Air Canada Vacations",17980],["singapore","Singapore city adventure","Air Canada Vacations",18840],["new-zealand","New Zealand scenic journey","Air New Zealand Holidays",22980],["south-africa","South Africa city and safari holiday","Air Canada Vacations",24980],
].map(([id,name,brand,price])=>({id:`trip-${id}`,name,brand,retailer:brand,price,isTripPrize:true,image:null,imageVerified:false,imageAlt:name,description:`Round-trip travel for two, premium accommodations, guided sightseeing, local experiences, and airport transfers.`}));

const THEME_ROWS = [
  ["reading","A READER'S DREAM","books and reading","Indigo","Home library","California Closets"],["winter","WINTER WONDERLAND","winter recreation","Sport Chek","Four-season mudroom","Canadian Tire"],["cycling","RIDE INTO ADVENTURE","cycling","Trek","Bicycle workshop","RONA"],["photography","CAPTURE THE MOMENT","photography","Henry's","Editing studio","Best Buy Canada"],["gaming","GAME ON","video gaming","Nintendo","Premium games room","The Brick"],["art","THE ART OF LIVING","Canadian art","Art Gallery of Ontario","Artist studio","DeSerres"],
  ["bbq","FIRE UP THE GRILL","outdoor cooking","Napoleon","Backyard dining pavilion","Toja Grid"],["hockey","HOCKEY NIGHT","hockey","CCM","Home sports lounge","Leon's"],["paddling","PADDLE CANADA","paddling","Nova Craft Canoe","Waterfront gear room","MEC"],["fashion","CANADIAN STYLE","fashion","Simons","Walk-in wardrobe","California Closets"],["baking","BAKE SOMETHING GREAT","baking","KitchenAid","Baker's kitchen","Canadian Appliance Source"],["crafting","MAKE IT YOURSELF","crafting","Cricut","Craft workshop","IKEA"],
  ["astronomy","UNDER THE STARS","astronomy","Celestron","Backyard observatory","RONA"],["board-games","FAMILY GAME NIGHT","board games","Snakes & Lattes","Custom game room","The Brick"],["skiing","HIT THE SLOPES","skiing","Rossignol","Ski storage room","California Closets"],["golf","TEE UP","golf","Callaway","Indoor golf simulator","Golfzon"],["pets-plus","BEST FRIENDS","pet care","PetSmart Canada","Designer pet room","Rolf C. Hagen"],["gardening-plus","GARDEN ALL YEAR","gardening","Lee Valley","Four-season greenhouse","BC Greenhouse Builders"],
  ["fitness-plus","STRONGER EVERY DAY","fitness","Northern Fitness","Recovery suite","Therabody"],["smart-kitchen","THE FUTURE OF COOKING","smart kitchen","Breville","Connected chef's kitchen","Bosch"],["road-cycling","THE OPEN ROAD","road cycling","Cervélo","Cycling support vehicle","Volvo Canada"],["canadian-design","DESIGNED IN CANADA","Canadian design","EQ3","Designer living room","Palliser"],["film-making","LIGHTS, CAMERA, ACTION","film production","Canon","Home screening room","Samsung"],["lake-cottage","THE GREAT CANADIAN COTTAGE","cottage living","Canadian Tire","Lakeside bunkhouse","Muskoka Living"],
];

export const ADDITIONAL_SHOWCASE_THEMES = THEME_ROWS.map(([id,title,focus,brand,space,spaceBrand],index)=>({
  id:`expanded-${id}`,title,intro:`This entirely new Showcase celebrates ${focus} with three distinctly Canadian prizes!`,
  prizes:[
    {id:`expanded-${id}-collection`,name:`Complete ${focus} collection`,brand,price:6200+index*310,image:null,imageVerified:false,description:`Premium ${focus} equipment, accessories, expert instruction, and a year of Canadian experiences.`},
    {id:`expanded-${id}-space`,name:space,brand:spaceBrand,price:10800+index*440,image:null,imageVerified:false,description:`A professionally designed and installed ${space.toLowerCase()} with Canadian furnishings, storage, lighting, and décor.`},
    {tripSlot:true},
  ],
}));

export const ADDITIONAL_SHOWCASE_REPLACEMENTS = [
  ["Premium home library","Indigo","Custom shelving, reading chairs, lighting, a tablet, and a thousand-book collection.",11840],["Four-season outdoor equipment","MEC","Premium camping, hiking, paddling, winter, and safety equipment for two.",12980],["Canadian living room collection","Palliser","A Canadian-made sectional, chairs, tables, lamps, rug, and delivery.",14890],["Complete games room","Palason","A pool table, shuffleboard, arcade cabinet, dartboard, and pub furniture.",13980],["Professional baker's kitchen","KitchenAid","Major appliances, mixers, bakeware, storage, and private baking instruction.",15480],["Home cinema collection","Samsung","An OLED television, immersive sound, media furniture, installation, and movie passes.",13790],
  ["Ultimate ski collection","Sport Chek","Skis, snowboards, clothing, safety equipment, roof carriers, and season passes.",12680],["Designer wardrobe for two","Simons","Four-season Canadian fashion, footwear, luggage, accessories, and personal styling.",10890],["Complete gardening retreat","Lee Valley","A greenhouse, raised beds, tools, irrigation, storage, and professional landscaping.",16480],["Premium pet-care collection","PetSmart Canada","Furniture, feeding systems, grooming, training, wellness visits, and a year's food.",9980],["Whole-home organization system","California Closets","Custom closets, pantry, mudroom, garage storage, and professional installation.",18940],["Electric bicycle collection","Canadian Tire","Two long-range electric bicycles, helmets, panniers, locks, and maintenance.",11280],
  ["Canadian music collection","Long & McQuade","Instruments, recording equipment, concert tickets, lessons, and a furnished music room.",14980],["Creative maker workshop","DeWalt","Woodworking tools, 3D printers, workbenches, dust collection, storage, and safety gear.",17480],["Luxury backyard pool package","Pioneer Family Pools","An above-ground pool, deck, heater, safety cover, furniture, and installation.",24980],["Complete home spa","Dundalk LeisureCraft","A cedar sauna, hot tub, cold plunge, robes, privacy screen, and installation.",27980],["Premium canoe and camping package","Nova Craft Canoe","Two Canadian-made canoes, paddles, portage packs, camping gear, and training.",12840],["Connected home technology package","Best Buy Canada","Computers, televisions, audio, networking, security, smart lighting, and installation.",15980],
].map(([name,brand,description,price],index)=>({id:`showcase-expansion-${index+1}`,name,brand,retailer:brand,description,price,image:null,imageVerified:false,imageAlt:name}));
