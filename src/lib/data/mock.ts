export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  category: string;
  price: number;
  spotsLeft: number;
  totalSpots: number;
  organizer: string;
  description?: string;
}

export const categories = [
  { label: "All Events", value: "all" },
  { label: "Music", value: "music" },
  { label: "Tech", value: "tech" },
  { label: "Sports", value: "sports" },
  { label: "Comedy", value: "comedy" },
  { label: "Art", value: "art" },
  { label: "Food", value: "food" },
  { label: "Workshop", value: "workshop" },
];

export const featuredEvents: Event[] = [
  {
    id: "1",
    title: "Neon Pulse — Electronic Music Festival 2026",
    date: "Apr 15, 2026",
    time: "6:00 PM",
    location: "Jawaharlal Nehru Stadium, Delhi",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    category: "Music",
    price: 1499,
    spotsLeft: 43,
    totalSpots: 500,
    organizer: "LiveWire Productions",
  },
  {
    id: "2",
    title: "DevSprint 2026 — AI & Full-Stack Hackathon",
    date: "Apr 22, 2026",
    time: "9:00 AM",
    location: "IIT Bombay, Powai",
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    category: "Tech",
    price: 299,
    spotsLeft: 128,
    totalSpots: 200,
    organizer: "Hack Club India",
  },
  {
    id: "3",
    title: "Stand-Up Night with Abhishek Upmanyu",
    date: "May 3, 2026",
    time: "8:00 PM",
    location: "Canvas Laugh Club, Mumbai",
    imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80",
    category: "Comedy",
    price: 799,
    spotsLeft: 12,
    totalSpots: 150,
    organizer: "The Comedy Factory",
  },
  {
    id: "4",
    title: "Mumbai Marathon 2026 — 10K Spring Run",
    date: "May 10, 2026",
    time: "5:30 AM",
    location: "Marine Drive, Mumbai",
    imageUrl: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&q=80",
    category: "Sports",
    price: 0,
    spotsLeft: 890,
    totalSpots: 5000,
    organizer: "Run for Health Foundation",
  },
  {
    id: "5",
    title: "Digital Art Exhibition — The Future Canvas",
    date: "May 18, 2026",
    time: "11:00 AM",
    location: "National Gallery of Modern Art, Delhi",
    imageUrl: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80",
    category: "Art",
    price: 199,
    spotsLeft: 250,
    totalSpots: 300,
    organizer: "ArtVerse India",
  },
  {
    id: "6",
    title: "React India Conference 2026",
    date: "Jun 5, 2026",
    time: "10:00 AM",
    location: "Hyderabad International Convention Centre",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    category: "Tech",
    price: 1999,
    spotsLeft: 75,
    totalSpots: 400,
    organizer: "React India Community",
  },
];

export const stats = [
  { value: "12K+", label: "Events Hosted" },
  { value: "450K+", label: "Tickets Sold" },
  { value: "1.2M+", label: "Happy Users" },
  { value: "150+", label: "Cities" },
];
