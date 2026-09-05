import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed data matching the luxury Kre8mind frontend
const defaultData = {
  inquiries: [
    {
      id: "req_demo_01",
      createdAt: new Date().toISOString(),
      name: "Marcus Vance",
      email: "marcus@vancecapital.com",
      company: "Vance Capital",
      serviceTier: "Full Product Design",
      addons: ["Design System & Tokens", "Web Development"],
      budget: "$10,000 - $15,000",
      timeline: "4-6 Weeks",
      details: "Need a complete overhaul of our investor platform UI and institutional design system.",
      status: "NEW"
    }
  ],
  projects: [
    {
      id: "proj_01",
      title: "Verve Mobility",
      category: "FINTECH & MOBILITY",
      year: "2026",
      summary: "Autonomous urban transit operating system and fleet command UX.",
      image: "assets/showcase/journal-1.jpg",
      tags: ["UI/UX", "Design System", "Interaction"],
      order: 1,
      featured: true
    },
    {
      id: "proj_02",
      title: "Aura Health AI",
      category: "HEALTHCARE TECH",
      year: "2026",
      summary: "Predictive diagnostic suite designed for clinical precision and high-throughput workflows.",
      image: "assets/showcase/journal-2.jpg",
      tags: ["Product Strategy", "Design Audit", "Web App"],
      order: 2,
      featured: true
    },
    {
      id: "proj_03",
      title: "Synthetix Cloud",
      category: "AI & INFRASTRUCTURE",
      year: "2025",
      summary: "Next-gen cloud telemetry interface for high-concurrency neural compute clusters.",
      image: "assets/showcase/journal-3.jpg",
      tags: ["Dashboard", "Design Engineering", "SaaS"],
      order: 3,
      featured: true
    },
    {
      id: "proj_04",
      title: "KRONOS Atelier",
      category: "LUXURY COMMERCE",
      year: "2025",
      summary: "Bespoke digital flagship experience for high-end horology collectors.",
      image: "assets/showcase/journal-4.jpg",
      tags: ["E-Commerce", "Motion", "Brand Identity"],
      order: 4,
      featured: true
    }
  ],
  journal: [],
  testimonials: [
    {
      id: "testi_01",
      name: "Tife Ojo",
      role: "Founder",
      company: "Tife Ojo Consults",
      avatar: "assets/clients/Tife Ojo Consults.png",
      quote: "Before working with Kre8mind, our clients struggled to grasp our full consulting depth. They distilled our proposition into an interface that feels effortless, commanding, and directly drove a 3x surge in qualified inquiries.",
      order: 1
    },
    {
      id: "testi_02",
      name: "Adebayo Davies",
      role: "Co-Founder & CEO",
      company: "SwyChr",
      avatar: "assets/clients/Swychr Logo PNG 1.png",
      quote: "Kre8mind didn't just redesign our product; they fundamentally changed how we communicate our value. The clarity and precision they brought to the table turned confusion into confidence, reducing drop-off by 44%.",
      order: 2
    },
    {
      id: "testi_03",
      name: "Marcus Vance",
      role: "Head of Product",
      company: "Xoria",
      avatar: "assets/clients/xoria.png",
      quote: "The precision in their Figma systems and technical handoff is world-class. Our engineering sprint velocity doubled because every edge case, state, and interaction was thoroughly resolved.",
      order: 3
    }
  ],
  analytics: [],
  settings: {
    adminPassword: "kre8mind2026",
    contactEmail: "hello@kre8mind.com",
    notificationsEnabled: true
  }
};

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
}

export const db = {
  read: () => {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.testimonials)) parsed.testimonials = defaultData.testimonials;
      if (!Array.isArray(parsed.analytics)) parsed.analytics = [];
      if (!Array.isArray(parsed.projects)) parsed.projects = defaultData.projects;
      if (!Array.isArray(parsed.journal)) parsed.journal = defaultData.journal;
      if (!Array.isArray(parsed.inquiries)) parsed.inquiries = defaultData.inquiries;
      if (!parsed.settings) parsed.settings = { ...defaultData.settings };
      return parsed;
    } catch (err) {
      console.error('Error reading database file:', err);
      return defaultData;
    }
  },
  write: (data) => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
      return true;
    } catch (err) {
      try {
        const tempPath = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.copyFileSync(tempPath, DB_FILE);
        fs.unlinkSync(tempPath);
        return true;
      } catch (err2) {
        console.error('Error writing database file:', err2);
        return false;
      }
    }
  }
};
