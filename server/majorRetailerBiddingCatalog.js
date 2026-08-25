// A maintained reserve for Contestants' Row. Every retailer in this file has
// a broad Canadian store presence or is a major national retail website. The
// records deliberately use regular-price merchandise and omit model numbers,
// sale language, marketplace sellers, and speculative product photographs.

export const MAJOR_BIDDING_RETAILERS = Object.freeze([
  "Best Buy Canada", "Canadian Tire", "Costco Canada", "Home Depot Canada",
  "IKEA Canada", "Leon's", "Michael Hill", "Pandora", "Peoples Jewellers",
  "RONA", "Sport Chek", "Staples Canada", "The Brick", "Walmart Canada",
]);

const SELLERS = {
  Tools: [
    ["Canadian Tire", "Mastercraft"], ["Home Depot Canada", "DeWalt"],
    ["RONA", "Bosch"], ["Home Depot Canada", "Milwaukee"],
  ],
  Appliances: [
    ["Best Buy Canada", "Samsung"], ["The Brick", "LG"],
    ["Leon's", "Whirlpool"], ["Walmart Canada", "Ninja"],
    ["Costco Canada", "KitchenAid"],
  ],
  Jewellery: [
    ["Peoples Jewellers", "Peoples"], ["Michael Hill", "Michael Hill"],
    ["Pandora", "Pandora"], ["Costco Canada", "Citizen"],
  ],
  "Outdoor Equipment": [
    ["Canadian Tire", "Woods"], ["Sport Chek", "CCM"],
    ["Walmart Canada", "Ozark Trail"], ["Costco Canada", "Yardistry"],
  ],
  Electronics: [
    ["Best Buy Canada", "Sony"], ["Staples Canada", "HP"],
    ["Walmart Canada", "Samsung"], ["Costco Canada", "Apple"],
  ],
  Furniture: [
    ["The Brick", "Primo International"], ["Leon's", "Ashley"],
    ["IKEA Canada", "IKEA"], ["Walmart Canada", "Mainstays"],
    ["Costco Canada", "Thomasville"],
  ],
};

const CATALOG = {
  Tools: [
    ["Cordless impact wrench kit", 499, "A high-torque impact wrench with two batteries, charger and fitted carrying case."],
    ["Benchtop drill press", 429, "A variable-speed drill press with an adjustable work table and built-in work light."],
    ["Portable table saw", 649, "A jobsite table saw with folding stand, rip fence and dust-collection port."],
    ["Sliding compound mitre saw", 799, "A dual-bevel mitre saw with a wide crosscut capacity and rolling stand."],
    ["Woodworking router table", 399, "A variable-speed router with a full-size table, fence and starter bit collection."],
    ["Thickness planer", 749, "A portable planer with a three-knife cutter head and folding material tables."],
    ["Floor-standing band saw", 899, "A workshop band saw with cast-iron table, rip fence and dust port."],
    ["Variable-speed scroll saw", 329, "A low-vibration scroll saw with tilting table, work light and blade assortment."],
    ["Wet tile saw", 579, "A water-cooled tile saw with sliding tray, folding stand and diamond blade."],
    ["Demolition hammer", 699, "A heavy-duty demolition hammer with vibration control, chisels and wheeled case."],
    ["Portable air compressor", 449, "A quiet portable compressor with air hose, regulator and inflation accessories."],
    ["Finish nailer package", 389, "A cordless finish nailer with battery, charger, nails and protective case."],
    ["Airless paint sprayer", 599, "A high-efficiency paint sprayer with a long hose, spray gun and extension wand."],
    ["Dust collection system", 549, "A wheeled workshop dust collector with filter bag, hose and machine adapters."],
    ["Bench grinder station", 299, "A variable-speed bench grinder with pedestal stand, work rests and safety shields."],
    ["Multiprocess welding package", 1099, "A multiprocess welder with helmet, gloves, cart and starter supplies."],
    ["Automotive floor jack set", 379, "A low-profile floor jack with four axle stands, wheel chocks and creeper."],
    ["Rolling mechanic cart", 599, "A locking steel service cart with drawers, power strip and organized hand tools."],
    ["Digital torque wrench set", 349, "Three digital torque wrenches with sockets, adapters and protective cases."],
    ["Thermal imaging camera", 799, "A handheld thermal camera with colour display, rechargeable battery and case."],
    ["Inspection camera kit", 269, "A waterproof inspection camera with colour screen, flexible cable and accessories."],
    ["Self-levelling rotary laser", 649, "A rotary laser system with receiver, tripod, grade rod and carrying case."],
    ["Concrete mixer", 629, "A portable electric concrete mixer with steel drum and puncture-resistant wheels."],
    ["Power drain auger", 829, "A wheeled drain-cleaning machine with interchangeable cutters and work gloves."],
    ["Portable generator", 1199, "A gasoline generator with electric start, covered outlets and wheel kit."],
    ["Workshop tool cabinet", 1499, "A locking rolling cabinet stocked with sockets, wrenches, pliers and drivers."],
    ["Maple workbench", 1299, "A solid maple workbench with two vises, bench dogs and lower storage shelf."],
    ["Professional pliers collection", 449, "A fitted case of gripping, cutting, electrical and precision pliers."],
    ["Electrical testing package", 699, "A multimeter, clamp meter, voltage tester, insulated probes and carrying case."],
    ["Portable scaffolding tower", 899, "A rolling steel scaffold with adjustable platforms, guard rails and locking casters."],
    ["Fibreglass extension ladder", 499, "A commercial fibreglass ladder with slip-resistant feet and a stabilizer bar."],
    ["Cordless plumbing press tool", 1599, "A battery press tool with copper jaws, charger and heavy-duty case."],
    ["Cordless grease gun kit", 399, "A powered grease gun with flexible hose, battery, charger and carrying case."],
    ["Digital stud and wall scanner", 229, "A wall scanner that locates wood, metal and live wiring behind common surfaces."],
    ["Soldering and rework station", 349, "A temperature-controlled soldering station with hot-air tool and accessory kit."],
    ["Hydraulic shop press", 699, "A floor-standing hydraulic press with pressure gauge and adjustable work bed."],
    ["Metal cutting shear", 549, "A benchtop metal shear with compound leverage, material guide and safety guard."],
  ],
  Appliances: [
    ["French-door refrigerator", 2699, "A spacious stainless refrigerator with adjustable shelves, ice maker and bottom freezer."],
    ["Counter-depth refrigerator", 2399, "A streamlined refrigerator with flexible storage, filtered water and concealed hinges."],
    ["Upright freezer", 1099, "A frost-free upright freezer with adjustable shelves, door storage and temperature alarm."],
    ["Convertible chest freezer", 799, "A roomy chest freezer with convertible cooling modes and removable storage baskets."],
    ["Front-load washing machine", 1199, "A high-capacity washer with steam cleaning, multiple cycles and smart controls."],
    ["Heat-pump clothes dryer", 1499, "An energy-saving ventless dryer with moisture sensors and a generous drum."],
    ["Laundry centre", 1899, "A stacked washer and dryer with full-size capacity and easy front controls."],
    ["Induction range", 2499, "A five-element induction range with convection oven and smooth glass cooktop."],
    ["Double wall oven", 3299, "Two built-in convection ovens with temperature probe and self-cleaning cycles."],
    ["Gas cooktop", 1399, "A five-burner gas cooktop with continuous grates and precise simmer control."],
    ["Built-in dishwasher", 999, "A quiet stainless dishwasher with adjustable racks and targeted wash zones."],
    ["Over-the-range microwave", 599, "A spacious microwave with sensor cooking, ventilation fan and task lighting."],
    ["Beverage centre", 749, "A glass-door beverage refrigerator with adjustable shelves and digital temperature control."],
    ["Dual-zone wine cooler", 999, "A dual-zone wine refrigerator with wooden shelves and UV-resistant glass door."],
    ["Portable air conditioner", 699, "A wheeled air conditioner with dehumidifying mode, remote control and window kit."],
    ["Whole-room air purifier", 549, "A large-room purifier with multi-stage filtration, air-quality sensor and quiet mode."],
    ["High-capacity dehumidifier", 449, "A basement-ready dehumidifier with pump, humidistat and continuous-drain option."],
    ["Robot vacuum and mop", 1199, "A self-emptying robot cleaner with mapping, obstacle detection and mopping system."],
    ["Cordless stick vacuum", 799, "A powerful cordless vacuum with filtration, floor tools and charging stand."],
    ["Carpet cleaning machine", 499, "A full-size carpet cleaner with heated washing, upholstery tool and cleaning solution."],
    ["Automatic espresso machine", 1299, "A bean-to-cup espresso machine with grinder, milk system and drink presets."],
    ["Professional stand mixer", 699, "A bowl-lift stand mixer with stainless bowl, beater, whisk and dough hook."],
    ["Smart countertop oven", 499, "A convection countertop oven with air-fry, roast, bake and proof settings."],
    ["Large-capacity air fryer", 329, "A dual-basket air fryer with synchronized cooking and dishwasher-safe parts."],
    ["Premium blender system", 649, "A high-performance blender with full-size pitcher, personal cups and food-processing bowl."],
    ["Food processor package", 399, "A large food processor with slicing discs, chopping blade and dough attachment."],
    ["Multi-cooker package", 279, "A pressure multi-cooker with slow-cook, steam, sauté and rice programs."],
    ["Countertop ice maker", 649, "A rapid countertop ice maker with large reservoir and self-cleaning cycle."],
    ["Bread maker", 249, "An automatic bread maker with custom programs, fruit dispenser and viewing window."],
    ["Cold-press juicer", 399, "A slow juicer with wide feed chute, pulp control and dishwasher-safe components."],
    ["Electric meat grinder", 349, "A heavy-duty meat grinder with stainless cutting plates and sausage attachments."],
    ["Induction burner set", 299, "Two portable induction burners with precise temperature settings and timers."],
    ["Garment care system", 1499, "A steam clothing-care cabinet that refreshes, dries and gently presses garments."],
    ["Portable washing machine", 699, "A compact top-load washer with multiple cycles and quick-connect sink adapter."],
    ["Water cooler dispenser", 329, "A bottom-loading water dispenser with hot, cold and room-temperature controls."],
    ["Combination steam oven", 2199, "A built-in steam oven with convection cooking, food probe and guided programs."],
    ["Warming drawer", 1299, "A built-in warming drawer with adjustable humidity, temperature control and timer."],
    ["Kitchen ventilation canopy", 899, "A stainless ventilation canopy with powerful fan, task lights and washable filters."],
    ["Countertop composter", 549, "An electric kitchen composter with odour control and removable processing bucket."],
    ["Food dehydrator", 349, "A stainless food dehydrator with adjustable heat, timer and ten drying trays."],
    ["Sous-vide cooking package", 299, "A precision immersion cooker with insulated container, rack and vacuum sealer."],
    ["Rice cooker", 399, "An induction rice cooker with multiple grain programs, timer and warming cycle."],
    ["Electric kettle and toaster set", 279, "A coordinated variable-temperature kettle and four-slice toaster in stainless steel."],
    ["Belgian waffle maker", 249, "A rotating waffle maker with browning control, drip tray and measuring cup."],
    ["Steam cleaning system", 499, "A multipurpose steam cleaner with floor head, detail tools and extension wands."],
    ["Tower fan package", 329, "Two quiet tower fans with remote controls, oscillation and programmable timers."],
    ["Compact beverage blender", 229, "A powerful personal blender with insulated cups, lids and travel accessories."],
    ["Automatic pet feeder", 299, "A connected pet feeder with portion scheduling, camera and sealed food hopper."],
    ["Electric indoor grill", 349, "A smokeless indoor grill with temperature probe and removable dishwasher-safe plates."],
    ["Frozen dessert maker", 299, "An automatic dessert maker with multiple programs and reusable storage containers."],
    ["Vacuum sealing system", 249, "A countertop vacuum sealer with roll storage, cutter and reusable containers."],
    ["Commercial toaster", 329, "A heavy-duty four-slot toaster with independent controls and removable crumb trays."],
  ],
  Jewellery: [
    ["Diamond solitaire pendant", 1299, "A round diamond solitaire set in white gold on an adjustable fine chain."],
    ["Canadian diamond stud earrings", 1699, "A matched pair of certified Canadian diamonds set in white gold."],
    ["Lab-grown diamond ring", 1999, "A brilliant lab-grown diamond in a polished white-gold cathedral setting."],
    ["Gold hoop earrings", 699, "A pair of substantial polished yellow-gold hoops with secure hinged clasps."],
    ["Sterling silver charm bracelet", 499, "A sterling bracelet with a selection of Canadian-themed keepsake charms."],
    ["Diamond tennis bracelet", 2499, "A continuous line of round diamonds set in polished sterling silver."],
    ["Automatic wristwatch", 1199, "A stainless automatic watch with sapphire crystal and exhibition case back."],
    ["Two-tone dress watch", 849, "A two-tone bracelet watch with date display and water-resistant case."],
    ["Cultured pearl necklace", 999, "A graduated strand of cultured pearls finished with a white-gold clasp."],
    ["Pearl drop earrings", 599, "Cultured pearl drops suspended from polished white-gold lever-back settings."],
    ["Sapphire halo ring", 1599, "A deep-blue sapphire framed by diamonds in a white-gold setting."],
    ["Emerald pendant", 1399, "An oval emerald with diamond accents on a fine yellow-gold chain."],
    ["Ruby cluster earrings", 1299, "Rich red rubies surrounded by diamond accents in white-gold settings."],
    ["Gold curb chain", 1899, "A substantial yellow-gold curb chain with a secure lobster clasp."],
    ["Diamond heart locket", 999, "A white-gold heart locket with diamond accents and room for two photographs."],
    ["Sterling silver bangle set", 449, "Three polished sterling bangles with contrasting textures and finishes."],
    ["Gold signet ring", 899, "A solid yellow-gold signet ring with a polished face and tapered band."],
    ["Diamond anniversary band", 1799, "A row of round diamonds in a low-profile white-gold anniversary band."],
    ["Rose-gold pendant necklace", 649, "A sculpted rose-gold pendant with a small diamond accent and fine chain."],
    ["Crystal statement necklace", 579, "A dramatic crystal necklace with graduated stones and an adjustable clasp."],
    ["Diamond station necklace", 1499, "Bezel-set diamonds spaced along a delicate white-gold chain."],
    ["Gold drop earrings", 799, "Sculpted yellow-gold drops with comfortable lever-back closures."],
    ["Moon-phase wristwatch", 1099, "A leather-strap watch with moon-phase display, calendar and sapphire crystal."],
    ["Chronograph watch", 949, "A stainless chronograph with timing subdials, date window and bracelet band."],
    ["Diamond floral brooch", 1199, "A floral sterling brooch accented with diamonds and a secure locking pin."],
    ["Pearl and gold bracelet", 749, "Cultured pearls linked with polished yellow-gold beads and a lobster clasp."],
    ["Birthstone pendant collection", 899, "Twelve sterling pendants set with colourful monthly birthstones and chains."],
    ["Diamond cuff bracelet", 1999, "A polished gold cuff finished with two bezel-set diamond end caps."],
    ["Gold anklet", 449, "A fine yellow-gold anklet with adjustable links and a secure spring clasp."],
    ["Diamond cufflink set", 1099, "Polished white-gold cufflinks with understated diamond centres and presentation box."],
    ["Opal cocktail ring", 1299, "An iridescent oval opal framed by diamonds in a yellow-gold setting."],
    ["Aquamarine drop pendant", 999, "A pale-blue aquamarine drop with diamond accent on a white-gold chain."],
    ["Diamond line earrings", 1499, "Graduated round diamonds in slender articulated white-gold drop settings."],
    ["Gold rope bracelet", 849, "A richly textured yellow-gold rope bracelet with a secure lobster clasp."],
    ["Jewellery keepsake chest", 599, "A wood jewellery chest with lined drawers, necklace hooks and locking lid."],
    ["Diamond tie bar", 749, "A polished white-gold tie bar with a subtle diamond accent and presentation case."],
    ["Gold medallion pendant", 899, "A sculpted yellow-gold medallion on an adjustable rope chain."],
  ],
  "Outdoor Equipment": [
    ["Family camping package", 899, "A weatherproof tent, four sleeping bags, camp stove, chairs and lanterns."],
    ["Recreational kayak package", 799, "A stable sit-in kayak with paddle, personal flotation device and cart."],
    ["Inflatable paddleboard set", 649, "An all-around paddleboard with adjustable paddle, pump, leash and backpack."],
    ["Aluminum fishing boat", 3999, "A lightweight fishing boat with oars, swivel seats and transport cover."],
    ["Electric trolling motor package", 999, "A quiet trolling motor with marine battery, charger and mounting hardware."],
    ["Hybrid bicycle", 1099, "A versatile aluminum bicycle with hydraulic disc brakes and commuter accessories."],
    ["Electric commuter bicycle", 2499, "A pedal-assist bicycle with removable battery, lights and rear cargo rack."],
    ["Mountain bicycle", 1599, "A trail-ready bicycle with front suspension, wide gearing and hydraulic brakes."],
    ["Complete golf club set", 1499, "A full set of woods, irons, wedges and putter with cart bag."],
    ["Golf launch monitor", 899, "A portable launch monitor that measures distance, speed and shot shape."],
    ["Hockey equipment package", 1199, "Skates, helmet, gloves, protective equipment, sticks and wheeled bag."],
    ["Backyard hockey rink kit", 699, "A reusable rink liner with boards, brackets, resurfacer and goal net."],
    ["Cross-country ski package", 1399, "Skis, boots, poles, bindings and wax kits for two adults."],
    ["Downhill ski package", 1899, "Skis, bindings, boots, poles, helmets and travel bags for two."],
    ["Family snowshoe package", 799, "Four pairs of trail snowshoes with poles, gaiters and carrying bags."],
    ["Insulated fishing shelter", 999, "A pop-up ice-fishing shelter with heater, folding chairs and transport sled."],
    ["Propane barbecue", 1199, "A premium barbecue with side burner, rotisserie and folding preparation shelves."],
    ["Pellet smoker", 999, "A digital pellet smoker with temperature probe, warming rack and weather cover."],
    ["Outdoor pizza oven", 799, "A high-temperature pizza oven with stone, peel, cover and preparation table."],
    ["Patio fire table", 899, "A propane fire table with glass guard, burner cover and concealed tank storage."],
    ["Cedar gazebo", 2999, "A cedar-roof gazebo with privacy panels, mosquito netting and anchoring hardware."],
    ["Backyard greenhouse", 2299, "A weather-resistant greenhouse with roof vents, shelving and foundation kit."],
    ["Garden storage shed", 1799, "A lockable weatherproof shed with floor, shelving and tool organizers."],
    ["Cordless lawn mower package", 1099, "A self-propelled mower with two batteries, rapid charger and grass bag."],
    ["Two-stage snow blower", 1799, "A self-propelled snow blower with electric start, heated grips and headlight."],
    ["Portable power station", 1599, "A high-capacity battery power station with folding solar panels and cables."],
    ["Inflatable hot tub", 999, "A four-person heated spa with insulated cover, pump and water-care kit."],
    ["Above-ground pool package", 2499, "A family pool with filter, ladder, cover and maintenance accessories."],
    ["Backyard trampoline", 899, "A large trampoline with safety enclosure, ladder and weather cover."],
    ["Adjustable basketball system", 749, "A height-adjustable basketball hoop with tempered-glass backboard and breakaway rim."],
    ["Table tennis package", 699, "A folding competition table with net, paddles, balls and storage cover."],
    ["Home rowing machine", 1299, "A folding magnetic rower with adjustable resistance and performance display."],
    ["Folding treadmill", 1699, "A cushioned treadmill with incline settings, workout programs and heart-rate sensors."],
    ["Telescope package", 899, "A computerized telescope with tripod, eyepieces and Canadian star guide."],
    ["Roof cargo box", 1099, "A locking aerodynamic roof box with mounting hardware and gear organizers."],
    ["Portable sauna tent", 799, "A weatherproof sauna tent with wood stove, chimney kit, benches and carry bags."],
    ["Disc golf course package", 599, "Six portable baskets with discs, marker flags and wheeled storage cart."],
  ],
  Electronics: [
    ["OLED smart television", 2299, "A 65-inch 4K OLED television with high-dynamic-range picture and streaming apps."],
    ["Mini-LED smart television", 1799, "A 75-inch 4K television with mini-LED backlighting and gaming features."],
    ["Home theatre projector", 1499, "A 4K-compatible projector with bright output, streaming support and ceiling mount."],
    ["Surround sound system", 1299, "A receiver, five compact speakers and powered subwoofer for room-filling sound."],
    ["Premium soundbar package", 999, "A wireless soundbar with subwoofer, rear speakers and immersive surround audio."],
    ["Turntable stereo system", 899, "A belt-drive turntable with integrated amplifier and bookshelf speakers."],
    ["Laptop computer", 1699, "A 15-inch laptop with 32 GB of memory and a 1 TB solid-state drive."],
    ["Gaming desktop computer", 2299, "A gaming computer with dedicated graphics, 32 GB of memory and fast storage."],
    ["All-in-one desktop computer", 1599, "A streamlined desktop with 27-inch display, wireless keyboard and mouse."],
    ["Professional computer monitor", 999, "A colour-accurate 32-inch 4K monitor with adjustable stand and USB hub."],
    ["Tablet and keyboard package", 1199, "A large-screen tablet with keyboard case, digital pencil and protective cover."],
    ["Foldable smartphone", 2199, "A foldable smartphone with multiple cameras, bright displays and generous storage."],
    ["Smartwatch package", 749, "A cellular smartwatch with fitness sensors, charging stand and extra bands."],
    ["Noise-cancelling headphones", 549, "Wireless over-ear headphones with adaptive noise cancellation and travel case."],
    ["Digital piano", 1499, "An 88-key digital piano with weighted keys, pedal unit, bench and headphones."],
    ["Mirrorless camera kit", 1899, "A compact interchangeable-lens camera with two lenses, bag and memory cards."],
    ["Action camera package", 799, "A waterproof action camera with stabilizer, mounts, batteries and carrying case."],
    ["Camera drone", 1499, "A folding drone with stabilized 4K camera, spare batteries and travel case."],
    ["Virtual reality system", 899, "A wireless virtual-reality headset with controllers, charging dock and games."],
    ["Video game console package", 999, "A current game console with two controllers, charging station and games."],
    ["Portable gaming computer", 899, "A handheld gaming computer with high-refresh display, dock and travel case."],
    ["Colour laser printer", 749, "A wireless colour laser printer with duplex printing, scanner and starter toner."],
    ["Large-format photo printer", 899, "A professional photo printer with archival inks, paper package and cutter."],
    ["Document scanner", 649, "A high-speed duplex scanner with automatic feeder and wireless connectivity."],
    ["Mesh Wi-Fi package", 699, "A three-unit whole-home Wi-Fi system with modern security and parental controls."],
    ["Network storage system", 1099, "A four-bay network storage unit with drives, backup software and remote access."],
    ["Home security package", 999, "A video doorbell, four wireless cameras, hub and smart sensors."],
    ["Smart home starter package", 799, "A smart display, thermostat, door lock, lights and voice-controlled plugs."],
    ["Portable party speaker", 649, "A rechargeable party speaker with wireless microphones, lighting and wheeled case."],
    ["Podcast studio package", 899, "Four microphones, audio mixer, headphones, stands and recording software."],
    ["E-reader package", 499, "A glare-free colour e-reader with cover, stylus and digital book credit."],
    ["Dash camera package", 599, "Front and rear high-resolution dash cameras with parking mode and memory card."],
    ["GPS navigation package", 549, "A large-screen vehicle navigator with Canadian maps, traffic updates and mount."],
    ["Digital media projector", 799, "A portable high-definition projector with streaming stick, screen and speakers."],
    ["Arcade cabinet", 899, "A full-size home arcade cabinet with classic games and illuminated controls."],
    ["Three-dimensional printer", 999, "A fast enclosed 3D printer with automatic calibration, materials and design software."],
    ["Laser engraving machine", 1299, "A desktop laser engraver with enclosed work area, ventilation and design software."],
    ["Electronic drum kit", 1199, "A mesh-head electronic drum kit with sound module, throne and monitor speaker."],
    ["Music synthesizer", 1399, "A performance synthesizer with full-size keys, sequencer, stand and sustain pedal."],
    ["Karaoke entertainment system", 699, "A portable karaoke system with display, wireless microphones and party lighting."],
    ["Racing simulator", 1699, "A racing seat, force-feedback wheel, pedals, shifter and wide gaming display."],
    ["Flight simulator controls", 899, "A flight yoke, throttle quadrant, rudder pedals and cockpit mounting frame."],
    ["Graphics drawing display", 749, "A pressure-sensitive drawing display with adjustable stand, stylus and creative software."],
    ["Digital picture frame collection", 599, "Four connected high-resolution frames with shared albums and remote updates."],
    ["Smart weather station", 449, "A connected weather station with outdoor sensors, colour console and forecast history."],
    ["Home intercom system", 799, "A video intercom with six room stations, door camera and hands-free communication."],
    ["Smart lighting collection", 649, "A whole-home collection of colour bulbs, switches, motion sensors and control hub."],
    ["Portable translator", 499, "A handheld voice translator with offline languages, camera translation and travel data."],
    ["Studio lighting package", 899, "Three adjustable LED panels with stands, soft boxes, controls and transport cases."],
    ["Wireless presentation system", 699, "A wireless conference-room display system with camera, speakerphone and controls."],
    ["Digital radio collection", 549, "Four tabletop radios with digital tuning, Bluetooth audio and rechargeable batteries."],
    ["Home electronics repair bench", 699, "An antistatic repair station with magnifier, power supply and precision instruments."],
  ],
  Furniture: [
    ["Living room sofa", 1699, "A tailored three-seat sofa with durable upholstery and reversible cushions."],
    ["Modular sectional", 2699, "A roomy modular sectional with deep seating, storage chaise and washable covers."],
    ["Power reclining loveseat", 2199, "A two-seat reclining loveseat with adjustable headrests and built-in charging."],
    ["Leather recliner", 1499, "A top-grain leather recliner with powered footrest and adjustable head support."],
    ["Home theatre seating", 2999, "A row of three powered theatre chairs with cup holders, storage and charging."],
    ["Dining room set", 1899, "A solid dining table with extension leaf and six coordinating upholstered chairs."],
    ["Counter-height dining set", 1499, "A counter-height table with storage base and six cushioned stools."],
    ["Dining buffet and hutch", 1699, "A coordinated buffet and glass-door hutch with drawers and adjustable shelves."],
    ["Queen bedroom suite", 2499, "A queen bed, dresser, mirror and two nightstands in a coordinated finish."],
    ["King bedroom suite", 3299, "A king bed, dresser, mirror, chest and two nightstands with generous storage."],
    ["Upholstered storage bed", 1399, "A queen upholstered bed with hydraulic lift platform and hidden storage."],
    ["Adjustable mattress set", 2999, "A queen mattress with powered adjustable base, massage settings and remotes."],
    ["Bunk bed package", 1299, "A solid twin-over-double bunk bed with mattresses, drawers and safety rails."],
    ["Daybed and trundle", 999, "An upholstered daybed with pull-out trundle and two supportive mattresses."],
    ["Wardrobe system", 1799, "A modular wardrobe with hanging space, drawers, shelves and mirrored doors."],
    ["Six-drawer dresser pair", 1399, "Two wide dressers with smooth-glide drawers and coordinating wall mirrors."],
    ["Executive office desk", 1299, "A substantial office desk with file drawers, cable management and matching return."],
    ["Ergonomic office chair", 1199, "A fully adjustable task chair with breathable support and polished aluminum base."],
    ["Home office wall unit", 1899, "A desk, bookcases and file storage combined in a coordinated modular wall unit."],
    ["Library bookcase collection", 1499, "Four tall bookcases with adjustable shelves, doors and integrated lighting."],
    ["Media console", 999, "A wide media console with ventilated storage, cable management and electric fireplace."],
    ["Coffee table collection", 899, "A lift-top coffee table with two matching end tables and concealed storage."],
    ["Entryway storage collection", 1099, "A hall tree, bench, shoe cabinet and wall mirror in a coordinated finish."],
    ["Kitchen island", 1199, "A freestanding kitchen island with stone top, drawers, shelves and two stools."],
    ["Bar cabinet", 999, "A locking bar cabinet with bottle storage, stemware racks and fold-out serving surface."],
    ["Accent cabinet pair", 899, "Two decorative cabinets with adjustable interior shelves and soft-close doors."],
    ["Console table collection", 799, "A console table with matching mirror, storage drawers and lower display shelf."],
    ["Upholstered bench set", 699, "A storage bench with two matching ottomans in durable performance fabric."],
    ["Nursery furniture set", 1699, "A convertible crib, changing dresser, bookcase and supportive crib mattress."],
    ["Craft room workstation", 1299, "A large craft table with adjustable shelving, drawers and rolling storage carts."],
    ["Vanity table set", 899, "A dressing table with lighted mirror, drawers and upholstered matching stool."],
    ["Murphy bed cabinet", 2499, "A queen wall-bed cabinet with integrated storage, lighting and supportive mattress."],
    ["Room divider shelving", 799, "A large open shelving unit with storage inserts and display compartments."],
    ["Lift-top storage ottoman", 599, "A large upholstered ottoman with hidden storage, serving trays and casters."],
    ["Massage chair", 3499, "A full-body massage chair with reclining positions, heated rollers and remote control."],
    ["Living room sideboard", 1099, "A wide sideboard with adjustable shelves, smooth drawers and cable access."],
    ["Glass display cabinet pair", 999, "Two lighted glass-door cabinets with adjustable shelves and locking doors."],
    ["Freestanding pantry cabinet", 899, "A tall pantry cabinet with pull-out drawers, shelves and soft-close doors."],
    ["Bathroom linen tower pair", 799, "Two slim linen towers with drawers, shelves and moisture-resistant finishes."],
    ["Bathroom vanity set", 1399, "A double-sink vanity with stone counter, storage drawers, mirrors and faucets."],
    ["Decorative room divider", 649, "A large folding divider with solid wood frames and woven privacy panels."],
    ["Record storage cabinet", 899, "A low cabinet with album dividers, equipment shelf and cable management."],
    ["Nesting table collection", 599, "Three coordinated nesting tables with durable tops and slim metal bases."],
    ["Indoor plant stand collection", 549, "Five coordinated plant stands with waterproof trays and adjustable shelves."],
    ["Grandfather clock", 1799, "A traditional floor clock with wood case, pendulum and chiming movement."],
    ["Convertible game table", 1299, "A dining-height table that converts for cards, puzzles and board games."],
    ["Architect drafting table", 899, "An adjustable drafting table with storage drawers, stool and task lamp."],
    ["Lateral filing cabinet set", 799, "Two locking lateral file cabinets with anti-tip hardware and smooth drawers."],
    ["Garage storage lockers", 1299, "Four heavy-duty locking cabinets with adjustable shelves and wall anchors."],
    ["Mudroom storage wall", 1599, "A modular mudroom wall with benches, cubbies, drawers and overhead cabinets."],
    ["Rolling kitchen cart pair", 749, "Two solid-wood kitchen carts with drawers, shelves and locking casters."],
    ["Foyer umbrella stand set", 599, "A coordinated foyer table, umbrella stand and wall mirror in a durable finish."],
  ],
};

const VISUALS = { Tools: "🛠️", Appliances: "🔌", Jewellery: "💎", "Outdoor Equipment": "🏕️", Electronics: "💻", Furniture: "🛋️" };
const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function majorRetailerSellerFor(category, name, index = 0) {
  const text = name.toLowerCase();
  if (category === "Tools") {
    if (/workbench|tool cabinet|mechanic cart/.test(text)) return ["Home Depot Canada", "Husky"];
    if (/pliers/.test(text)) return ["RONA", "Knipex"];
    if (/electrical|thermal|testing/.test(text)) return ["RONA", "Fluke"];
    if (/paint sprayer/.test(text)) return ["Home Depot Canada", "Wagner"];
    if (/weld/.test(text)) return ["Canadian Tire", "Lincoln Electric"];
    if (/compressor/.test(text)) return ["Home Depot Canada", "Makita"];
    if (/drain|plumbing press/.test(text)) return ["Home Depot Canada", "Ridgid"];
    if (/shop press|metal cutting shear/.test(text)) return ["Canadian Tire", "MAXIMUM"];
  }
  if (category === "Appliances") {
    if (/espresso|oven|air fryer|blender|food processor|multi-cooker|ice maker|bread|juicer|grinder|burner|kettle|toaster|waffle|sous-vide|rice cooker|dessert|indoor grill|sealing/.test(text)) {
      return [["Walmart Canada", "Ninja"], ["Costco Canada", "KitchenAid"], ["Best Buy Canada", "Breville"]][index % 3];
    }
    if (/vacuum|carpet|steam cleaning/.test(text)) return ["Best Buy Canada", "Dyson"];
    if (/air purifier|dehumidifier|air conditioner|fan|water cooler|pet feeder|composter/.test(text)) return ["Walmart Canada", "Honeywell"];
    return [["Best Buy Canada", "Samsung"], ["The Brick", "LG"], ["Leon's", "Whirlpool"]][index % 3];
  }
  if (category === "Jewellery") {
    if (/watch|chronograph/.test(text)) return ["Costco Canada", "Citizen"];
    if (/charm|bangle|anklet/.test(text)) return ["Pandora", "Pandora"];
    return index % 2 ? ["Michael Hill", "Michael Hill"] : ["Peoples Jewellers", "Peoples"];
  }
  if (category === "Outdoor Equipment") {
    if (/hockey/.test(text)) return ["Sport Chek", "CCM"];
    if (/golf/.test(text)) return ["Sport Chek", "Callaway"];
    if (/kayak|paddleboard|fishing boat|trolling/.test(text)) return ["Canadian Tire", "Pelican"];
    if (/gazebo|greenhouse/.test(text)) return ["Costco Canada", "Yardistry"];
    if (/barbecue|smoker|pizza oven/.test(text)) return ["Canadian Tire", "Napoleon"];
    if (/navigation/.test(text)) return ["Canadian Tire", "Garmin"];
    if (/snowshoe/.test(text)) return ["Sport Chek", "Atlas"];
    if (/ski package/.test(text)) return ["Sport Chek", "Rossignol"];
    if (/power station/.test(text)) return ["Canadian Tire", "Jackery"];
    return index % 2 ? ["Canadian Tire", "Woods"] : ["Walmart Canada", "Ozark Trail"];
  }
  if (category === "Electronics") {
    if (/computer|monitor|printer|scanner|wi-fi|network|presentation/.test(text)) return ["Staples Canada", "HP"];
    if (/tablet|smartwatch/.test(text)) return ["Costco Canada", "Apple"];
    if (/e-reader/.test(text)) return ["Best Buy Canada", "Kobo"];
    if (/piano|drum|synthesizer/.test(text)) return ["Best Buy Canada", "Yamaha"];
    if (/three-dimensional printer|laser engraving/.test(text)) return ["Best Buy Canada", "Creality"];
    if (/smart lighting/.test(text)) return ["Best Buy Canada", "Philips Hue"];
    if (/camera|drone/.test(text)) return ["Best Buy Canada", "Canon"];
    if (/console|gaming|arcade/.test(text)) return ["Best Buy Canada", "Nintendo"];
    if (/television|projector|sound|stereo|turntable|headphones|speaker|karaoke|radio/.test(text)) return ["Best Buy Canada", "Sony"];
    return ["Best Buy Canada", "Samsung"];
  }
  if (category === "Furniture") {
    if (/bathroom vanity/.test(text)) return ["Home Depot Canada", "Glacier Bay"];
    if (/shelving|divider|nesting|plant stand|filing|cart|umbrella/.test(text)) return ["IKEA Canada", "IKEA"];
    if (/massage|theatre|sectional|dining|bedroom|sofa|loveseat|recliner/.test(text)) return index % 2 ? ["The Brick", "Ashley"] : ["Leon's", "Ashley"];
    if (/nursery|bunk|daybed|ottoman|vanity/.test(text)) return ["Walmart Canada", "Mainstays"];
    return ["Costco Canada", "Thomasville"];
  }
  return SELLERS[category][index % SELLERS[category].length];
}

export function majorRetailerBiddingCatalog() {
  return Object.entries(CATALOG).flatMap(([category, items]) => items.map(([name, exactPrice, description], index) => {
    const [retailer, brand] = majorRetailerSellerFor(category, name, index);
    return {
      id: `major-retailer-${slugify(category)}-${slugify(name)}`,
      name, brand, retailer, exactPrice, price: Math.round(exactPrice),
      priceIsLive: false, priceKind: "regular", currency: "CAD",
      url: `catalogue:major-retailer/${slugify(category)}/${slugify(name)}`,
      image: null, imageVerified: false, imageAlt: name, visual: VISUALS[category],
      description, category,
    };
  }));
}
