// backend/src/database.js
// Using NeDB - simple file database, works on all systems!

const Datastore = require("nedb-promises");
const path      = require("path");

const DB_DIR = path.join(__dirname, "../data");

// Create separate collections (like tables)
const db = {
  users:         Datastore.create({ filename: path.join(DB_DIR, "users.db"),         autoload: true }),
  content:       Datastore.create({ filename: path.join(DB_DIR, "content.db"),       autoload: true }),
  watchlist:     Datastore.create({ filename: path.join(DB_DIR, "watchlist.db"),     autoload: true }),
  history:       Datastore.create({ filename: path.join(DB_DIR, "history.db"),       autoload: true }),
  subscriptions: Datastore.create({ filename: path.join(DB_DIR, "subscriptions.db"), autoload: true }),
  notifications: Datastore.create({ filename: path.join(DB_DIR, "notifications.db"), autoload: true }),
  transactions:  Datastore.create({ filename: path.join(DB_DIR, "transactions.db"),  autoload: true }),
};

// ── Seed default data ──────────────────────────
async function seedData() {
  // Check if already seeded
  const adminExists = await db.users.findOne({ email: "admin@streamx.in" });
  if (adminExists) {
    console.log("✅ Database already has data");
    return;
  }

  // Add default users
  await db.users.insert([
    {
      _id: "admin1",
      name: "StreamX Admin",
      email: "admin@streamx.in",
      password: "Admin@1234",
      role: "admin",
      plan: "Premium",
      isActive: true,
      createdAt: new Date(),
    },
    {
      _id: "u1",
      name: "Rahul Sharma",
      email: "demo@streamx.in",
      password: "Demo@1234",
      role: "user",
      plan: "Premium",
      isActive: true,
      createdAt: new Date(),
    },
  ]);

  // Add default content
  await db.content.insert([
    { _id:"c1",  title:"Apex Protocol",       type:"Movie",  genre:"Action",   emoji:"🔥", score:9.1, views:4200000, likes:380000, duration:"2h 4m",   language:"EN/HI/TA", tags:"4K,HDR",   isPremium:true,  isFeatured:true,  isActive:true, description:"An elite soldier must stop a rogue AI in 48 hours."           },
    { _id:"c2",  title:"Dark Meridian",        type:"Series", genre:"Sci-Fi",   emoji:"🌌", score:8.8, views:3100000, likes:290000, duration:"S1·8ep",  language:"EN/HI",    tags:"4K,HDR",   isPremium:true,  isFeatured:true,  isActive:true, description:"A wormhole researcher discovers reality has a kill switch."    },
    { _id:"c3",  title:"Bombay Central",       type:"Movie",  genre:"Drama",    emoji:"🏙️", score:8.5, views:5600000, likes:520000, duration:"2h 15m",  language:"HI/EN",    tags:"4K,Dolby", isPremium:false, isFeatured:true,  isActive:true, description:"Three strangers collide at a Mumbai railway station."          },
    { _id:"c4",  title:"IPL 2026 Finals",      type:"Live",   genre:"Cricket",  emoji:"🏏", score:0,   views:12400000,likes:0,      duration:"Live",    language:"HI/EN/TA", tags:"LIVE,4K",  isPremium:false, isFeatured:true,  isActive:true, description:"LIVE: Mumbai Indians vs Chennai Super Kings!"                 },
    { _id:"c5",  title:"Steel Horizon",        type:"Series", genre:"Action",   emoji:"🤖", score:8.6, views:2800000, likes:241000, duration:"S2·10ep", language:"EN/HI",    tags:"HD",       isPremium:true,  isFeatured:false, isActive:true, description:"A mechanized police unit goes rogue in a smart city."         },
    { _id:"c6",  title:"Rang De Basanti 2",    type:"Movie",  genre:"Drama",    emoji:"🎭", score:9.0, views:7200000, likes:680000, duration:"2h 35m",  language:"HI/EN",    tags:"4K,Award", isPremium:false, isFeatured:true,  isActive:true, description:"A new generation rises to avenge a forgotten martyr."         },
    { _id:"c7",  title:"Quantum Cascade",      type:"Movie",  genre:"Thriller", emoji:"⚡", score:8.3, views:2100000, likes:178000, duration:"1h 55m",  language:"EN",       tags:"HDR",      isPremium:true,  isFeatured:false, isActive:true, description:"A physicist holds the key to breaking all encryption."        },
    { _id:"c8",  title:"Chhota Bheem Returns", type:"Series", genre:"Kids",     emoji:"🦸", score:8.0, views:8900000, likes:740000, duration:"S3·26ep", language:"HI/EN/TA", tags:"HD",       isPremium:false, isFeatured:false, isActive:true, description:"Bheem faces the most powerful villain in Dholakpur!"         },
    { _id:"c9",  title:"Deep Margin",          type:"Doc",    genre:"Nature",   emoji:"🌊", score:4.9, views:1400000, likes:128000, duration:"1h 58m",  language:"EN/HI",    tags:"4K,Award", isPremium:false, isFeatured:false, isActive:true, description:"90 days inside the last uncharted deep-sea research station." },
    { _id:"c10", title:"Neon Karma",           type:"Movie",  genre:"Romance",  emoji:"💫", score:7.9, views:1900000, likes:162000, duration:"1h 52m",  language:"HI",       tags:"HD",       isPremium:false, isFeatured:false, isActive:true, description:"Two rival musicians discover they were always meant to meet."  },
  ]);

  console.log("✅ Default users created");
  console.log("✅ Default content created");
}

// Run seed
seedData().catch(console.error);

console.log("✅ Database connected → /data folder");

module.exports = db;