import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning database...");
  await prisma.booking.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // ── Organizers (famous anime characters) ───────────────────────────────────
  console.log("👤 Creating organizers...");

  const gojo = await prisma.user.create({
    data: {
      name: "Gojo Satoru",
      email: "gojo@jujutsuhigh.edu",
      role: "ORGANIZER",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    },
  });

  const levi = await prisma.user.create({
    data: {
      name: "Levi Ackerman",
      email: "levi@scoutregiment.org",
      role: "ORGANIZER",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    },
  });

  const naruto = await prisma.user.create({
    data: {
      name: "Naruto Uzumaki",
      email: "naruto@konoha.gov",
      role: "ORGANIZER",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    },
  });

  const mikasa = await prisma.user.create({
    data: {
      name: "Mikasa Ackerman",
      email: "mikasa@scoutregiment.org",
      role: "ORGANIZER",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    },
  });

  const luffy = await prisma.user.create({
    data: {
      name: "Monkey D. Luffy",
      email: "luffy@mugiwara.crew",
      role: "ORGANIZER",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    },
  });

  function daysFromNow(n: number) {
    return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  console.log("🎫 Creating events...");

  // ── TECH (3 events) ────────────────────────────────────────────────────────
  await prisma.event.create({
    data: {
      title: "AI Jutsu: Machine Learning Summit 2026",
      description:
        "The most powerful gathering of AI researchers and engineers this side of the Hidden Leaf. Explore large language models, neural jutsu architectures, and the future of AGI. Keynotes by researchers from DeepMind, Anthropic, and Capsule Corporation Labs. Workshops on PyTorch, JAX, and transformer fine-tuning.",
      date: daysFromNow(12),
      location: "Capsule Corporation HQ, West City",
      // Futuristic capsule-corp-style tech laboratory
      imageUrl: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&q=80&w=1200",
      category: "Tech",
      organizerId: gojo.id,
      tickets: {
        create: [
          { name: "General Admission", price: 599, capacity: 400 },
          { name: "VIP All-Access", price: 1499, capacity: 40 },
          { name: "Student Pass", price: 149, capacity: 150 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Jujutsu Tech Cybersecurity Conference",
      description:
        "A two-day deep-dive into offensive and defensive security techniques. Red team vs. blue team exercises, CTF challenges, and talks on zero-day exploits, reverse engineering cursed spirits from malware samples, and cloud security hardening. Hosted at Jujutsu Metropolitan Curse Technical College.",
      date: daysFromNow(20),
      location: "Jujutsu Metropolitan Curse Technical College, Shinjuku",
      // Dark glowing code — matching the Jujutsu dark-energy aesthetic
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
      category: "Tech",
      organizerId: gojo.id,
      tickets: {
        create: [
          { name: "Conference Pass", price: 399, capacity: 300 },
          { name: "CTF Competitor", price: 199, capacity: 200 },
          { name: "Workshop Bundle", price: 799, capacity: 60 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "HeroTech Innovation Expo",
      description:
        "Where quirk-powered technology meets cutting-edge engineering. Startups demo wearable tech, AR interfaces, and robotics inspired by pro-hero gear. Panel discussions on AI in disaster response, smart city infrastructure, and the ethics of power-augmentation technology.",
      date: daysFromNow(35),
      location: "UA High Research Center, Musutafu City",
      // Bright futuristic innovation hall — matches UA High campus energy
      imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
      category: "Tech",
      organizerId: gojo.id,
      tickets: {
        create: [
          { name: "Expo Entry", price: 0, capacity: 500 },
          { name: "Startup Exhibitor", price: 999, capacity: 50 },
          { name: "Demo Day VIP", price: 299, capacity: 80 },
        ],
      },
    },
  });

  // ── MUSIC (3 events) ───────────────────────────────────────────────────────
  await prisma.event.create({
    data: {
      title: "Shibuya Electronic Nights Festival",
      description:
        "Three stages, 24 artists, one unforgettable night in the heart of Tokyo. Featuring Japan's top DJs alongside international electronic acts. Laser shows, art installations, and the best street food in Shibuya. This is the festival that defines the season.",
      date: daysFromNow(5),
      location: "Shibuya Grand Arena, Tokyo",
      // Shibuya crossing at night — iconic Tokyo nightlife scene
      imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1200",
      category: "Music",
      organizerId: mikasa.id,
      tickets: {
        create: [
          { name: "Early Bird", price: 0, capacity: 300 },
          { name: "General Entry", price: 55, capacity: 3000 },
          { name: "Backstage Pass", price: 250, capacity: 30 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Soul Society Symphony Night",
      description:
        "A breathtaking orchestral evening performing iconic anime soundtracks — Attack on Titan, Demon Slayer, Your Lie in April, and more. The 80-piece Soul Society Philharmonic Orchestra will bring these beloved scores to life in a grand concert hall setting.",
      date: daysFromNow(18),
      location: "Soul Society Grand Concert Hall, Seireitei",
      // Grand concert hall with orchestra — matches Soul Society's majestic vibe
      imageUrl: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&q=80&w=1200",
      category: "Music",
      organizerId: mikasa.id,
      tickets: {
        create: [
          { name: "Gallery Seat", price: 89, capacity: 400 },
          { name: "Orchestra Stalls", price: 159, capacity: 200 },
          { name: "Grand Tier Box", price: 399, capacity: 50 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Wano Grand Jazz & Kabuki Night",
      description:
        "An extraordinary fusion of traditional kabuki performance and modern jazz in the Flower Capital's legendary grand theater. Eight acclaimed jazz musicians collaborate with Wano's master kabuki troupe for a one-of-a-kind night that honors both ancient tradition and modern improvisation.",
      date: daysFromNow(28),
      location: "Flower Capital Grand Theater, Wano Country",
      // Traditional Japanese theater stage — Wano's kabuki/samurai aesthetic
      imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&q=80&w=1200",
      category: "Music",
      organizerId: mikasa.id,
      tickets: {
        create: [
          { name: "Standard", price: 120, capacity: 350 },
          { name: "Premium Front Row", price: 280, capacity: 60 },
        ],
      },
    },
  });

  // ── GAMING (2 events) ─────────────────────────────────────────────────────
  await prisma.event.create({
    data: {
      title: "UA Sports Festival: Esports Championship",
      description:
        "The most intense esports tournament of the year is here! 128 players compete across 4 titles: Valorant, League of Legends, Street Fighter 6, and Super Smash Bros. Spectator-friendly format with live commentary, pro cosplayers, and a massive prize pool of ₹5,00,000.",
      date: daysFromNow(8),
      location: "UA Sports Arena, Musutafu City",
      imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200",
      category: "Gaming",
      organizerId: levi.id,
      tickets: {
        create: [
          { name: "Spectator Day Pass", price: 40, capacity: 1000 },
          { name: "Competitor Registration", price: 200, capacity: 128 },
          { name: "Weekend All-Access", price: 75, capacity: 500 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Grand Line Pro Gaming Tournament",
      description:
        "Set sail for the ultimate gaming showdown on the Sabaody Archipelago. Pro teams from across the world compete in a round-robin LAN tournament. Featuring a dedicated retro gaming zone, indie dev showcase, and VR experiences. Food, merchandise, and meet-and-greet with pro streamers.",
      date: daysFromNow(45),
      location: "Sabaody Archipelago Gaming Hub, New World",
      imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1200",
      category: "Gaming",
      organizerId: luffy.id,
      tickets: {
        create: [
          { name: "Entry Pass", price: 30, capacity: 2000 },
          { name: "Pro Competitor", price: 350, capacity: 64 },
          { name: "VIP Lounge", price: 199, capacity: 100 },
        ],
      },
    },
  });

  // ── ANIME / CULTURAL (3 events) ────────────────────────────────────────────
  await prisma.event.create({
    data: {
      title: "Konoha Annual Matsuri & Cosplay Parade",
      description:
        "The Hidden Leaf Village comes alive for its annual summer matsuri — and this year it doubles as one of India's largest cosplay gatherings. 200+ stalls, food courts, live taiko drumming, a Naruto run race, art exhibitions, and the grand cosplay parade judged by industry veterans.",
      date: daysFromNow(14),
      location: "Hidden Leaf Village Cultural Center, Konoha",
      // Japanese summer matsuri with lanterns and festival stalls
      imageUrl: "https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&q=80&w=1200",
      category: "Anime",
      organizerId: naruto.id,
      tickets: {
        create: [
          { name: "General Entry", price: 0, capacity: 2000 },
          { name: "Cosplay Competitor", price: 50, capacity: 300 },
          { name: "Premium Wristband", price: 299, capacity: 200 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Attack on Cosplay: Annual Gathering",
      description:
        "The largest Attack on Titan fan convention outside Japan. Panel discussions with voice actors, exclusive merchandise, official art gallery, 3D maneuver gear demonstrations, and a cosplay competition with categories for every series in the franchise. A titan-sized event you cannot miss.",
      date: daysFromNow(22),
      location: "Shiganshina District Expo Center, Paradis Island",
      // Large convention hall crowd — matches AoT fan convention atmosphere
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200",
      category: "Anime",
      organizerId: levi.id,
      tickets: {
        create: [
          { name: "Day Pass", price: 199, capacity: 1500 },
          { name: "2-Day Pass", price: 349, capacity: 800 },
          { name: "Collector VIP", price: 699, capacity: 100 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Fairy Tail Magic Arts Exhibition",
      description:
        "An immersive art exhibition celebrating the 15th anniversary of Fairy Tail. Featuring original manga pages, concept art, animated installations, and live sketching sessions with Hiro Mashima-inspired artists. Interactive magic simulation booths let you feel what it's like to cast Natsu's Fire Dragon Roar.",
      date: daysFromNow(40),
      location: "Fairy Tail Guild Hall, Magnolia Town",
      // Vibrant art gallery with colourful installations — Fairy Tail magic-arts energy
      imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200",
      category: "Anime",
      organizerId: naruto.id,
      tickets: {
        create: [
          { name: "Exhibition Entry", price: 150, capacity: 500 },
          { name: "Artist Meet & Greet", price: 450, capacity: 80 },
        ],
      },
    },
  });

  // ── FOOD (2 events) ────────────────────────────────────────────────────────
  await prisma.event.create({
    data: {
      title: "Ichiraku Ramen Championship",
      description:
        "Twenty of the finest ramen chefs from across Asia compete to create the ultimate bowl. Attendees vote for People's Choice while an expert panel judges on broth depth, noodle texture, and creativity. Eat unlimited tasting portions, attend ramen masterclasses, and take home a signed Naruto bowl.",
      date: daysFromNow(9),
      location: "Ichiraku Bowl Arena, Hidden Leaf Village",
      // Steaming ramen bowl in Japanese ramen shop — Ichiraku-perfect
      imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&q=80&w=1200",
      category: "Food",
      organizerId: naruto.id,
      tickets: {
        create: [
          { name: "Tasting Pass (10 bowls)", price: 249, capacity: 600 },
          { name: "VIP Chef Table", price: 799, capacity: 40 },
          { name: "Masterclass + Entry", price: 499, capacity: 100 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Totoro Forest Farm-to-Table Dinner",
      description:
        "An intimate outdoor dining experience in a lush forest setting, inspired by Studio Ghibli's pastoral scenes. Seven-course dinner crafted entirely from local organic produce, natural wines, and foraged ingredients. Live acoustic music, firefly walks, and a short film screening under the stars.",
      date: daysFromNow(30),
      location: "Satsuma Forest Farm, Tokorozawa Countryside",
      // Lush Japanese forest path — directly matches the Totoro/Ghibli countryside
      imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=1200",
      category: "Food",
      organizerId: naruto.id,
      tickets: {
        create: [
          { name: "Dinner for 1", price: 1499, capacity: 60 },
          { name: "Dinner for 2 (couple)", price: 2699, capacity: 30 },
        ],
      },
    },
  });

  // ── BUSINESS (2 events) ────────────────────────────────────────────────────
  await prisma.event.create({
    data: {
      title: "Titan Capital Startup Pitch Battle",
      description:
        "Twelve promising early-stage startups pitch to a panel of Wall Rose's top venture capitalists. Sectors: EdTech, HealthTech, CleanEnergy, and AI. Network with 200+ investors, attend a pre-event masterclass on fundraising fundamentals, and compete for ₹50 lakh in seed funding.",
      date: daysFromNow(3),
      location: "Trost District Business Hub, Wall Rose",
      imageUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200",
      category: "Business",
      organizerId: levi.id,
      tickets: {
        create: [
          { name: "Founder Pass", price: 25, capacity: 120 },
          { name: "Investor Pass", price: 250, capacity: 50 },
          { name: "Masterclass Bundle", price: 499, capacity: 80 },
        ],
      },
    },
  });

  await prisma.event.create({
    data: {
      title: "Shinobi Ventures: Web3 Founders Summit",
      description:
        "Two days of deep-dive sessions on blockchain infrastructure, DeFi protocol design, NFT utility, and DAO governance — distilled to the fundamentals that actually matter. No hype, all substance. Attended by 60+ founders who have shipped real products on Ethereum, Solana, and Cosmos.",
      date: daysFromNow(50),
      location: "Konoha Tech Park, Hidden Leaf Village",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200",
      category: "Business",
      organizerId: gojo.id,
      tickets: {
        create: [
          { name: "Summit Pass", price: 699, capacity: 200 },
          { name: "Speaker Networking", price: 1299, capacity: 60 },
        ],
      },
    },
  });

  // ── SEAT-LOCKING DEMO EVENT (1 seat total) ─────────────────────────────────
  // Use this to prove Redis seat-locking: open two browser windows, both
  // signed in as different users, and try to book simultaneously. Only one
  // should succeed; the other gets "No seats available".
  console.log("🔒 Creating seat-locking demo event...");
  await prisma.event.create({
    data: {
      title: "⚡ Seat Lock Demo — Only 1 Ticket Available",
      description:
        "This event exists purely to demonstrate real-time seat locking. " +
        "There is exactly ONE General Admission ticket. Open two browser windows, log in as two different users, " +
        "and try to add the ticket to your cart simultaneously. The Redis seat-lock system will grant the seat to " +
        "whichever user claims it first and return an error to the second. " +
        "This proves that EventNexus prevents double-booking at the infrastructure level, " +
        "not just at the database level.",
      date: daysFromNow(7),
      location: "EventNexus Demo Hall, Test City",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=1200",
      category: "Tech",
      organizerId: gojo.id,
      tickets: {
        create: [
          { name: "General Admission", price: 1, capacity: 1 }, // Exactly 1 seat
        ],
      },
    },
  });

  console.log("✅ Seeding complete! Created 16 events across 8 categories.");
  console.log("   Organizers: Gojo Satoru, Levi Ackerman, Naruto Uzumaki, Mikasa Ackerman, Monkey D. Luffy");
  console.log("   Categories: Tech, Music, Gaming, Anime, Food, Business");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
