const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const cookieSession = require("cookie-session");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("galaxy.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  avatar TEXT DEFAULT '🌌',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  category TEXT NOT NULL,
  image TEXT DEFAULT '🎮',
  stock INTEGER DEFAULT 999,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price_cents INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, moderator_id INTEGER NOT NULL,
  action TEXT NOT NULL, reason TEXT, expires_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id INTEGER NOT NULL, title TEXT NOT NULL,
  description TEXT NOT NULL, price_cents INTEGER NOT NULL, category TEXT NOT NULL,
  image TEXT DEFAULT '🎮', status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (!count) {
  const hash = bcrypt.hashSync("ChangeMe123!", 10);
  db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)")
    .run("admin", hash, "admin");
}
const products = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (!products) {
  const seed = db.prepare("INSERT INTO products (name,description,price_cents,category,image,stock) VALUES (?,?,?,?,?,?)");
  seed.run("GTA V Private-Session Setup", "Help configuring a legitimate private/story-mode setup and quality-of-life tools.", 1500, "GTA V Services", "🚗", 25);
  seed.run("Gaming PC Tune-Up", "General performance and settings consultation for supported games.", 2000, "PC Services", "⚡", 25);
  seed.run("Custom Gaming Banner", "Conquering The Games-themed banner designed for your gaming profile or community.", 1000, "Design", "🎨", 50);
  seed.run("Discord Community Setup", "Help organising channels, roles and moderation settings for your community.", 2500, "Community", "💬", 20);
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieSession({
  name: "galaxy_session",
  keys: [process.env.SESSION_SECRET || "replace-this-secret-in-production"],
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production"
}));
app.use(express.static(path.join(__dirname, "public")));

const authLimiter = rateLimit({windowMs: 15*60*1000, max: 60});

function user(req) {
  if (!req.session.userId) return null;
  return db.prepare("SELECT id,username,role,avatar,created_at,banned,ban_reason,ban_expires FROM users WHERE id=?").get(req.session.userId);
}
function requireAuth(req,res,next) {
  const u=user(req); if (!u) return res.status(401).json({error:"Login required"}); if (u.banned) return res.status(403).json({error:"Your account is banned."}); next();
}
function requireAdmin(req,res,next) {
  const u = user(req);
  if (!u || u.role !== "admin") return res.status(403).json({error:"Admin access required"});
  next();
}

app.get("/api/me", (req,res)=>res.json({user:user(req)}));

app.post("/api/register", authLimiter, async (req,res)=>{
  const {username,password} = req.body;
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username||"")) return res.status(400).json({error:"Username must be 3-24 characters."});
  if (!password || password.length < 8) return res.status(400).json({error:"Password must be at least 8 characters."});
  try {
    const hash = await bcrypt.hash(password,10);
    const info = db.prepare("INSERT INTO users(username,password) VALUES(?,?)").run(username,hash);
    req.session.userId = info.lastInsertRowid;
    res.json({ok:true,user:user(req)});
  } catch { res.status(409).json({error:"Username is already taken."}); }
});

app.post("/api/login", authLimiter, async (req,res)=>{
  const row = db.prepare("SELECT * FROM users WHERE username=?").get(req.body.username);
  if (!row || !(await bcrypt.compare(req.body.password||"",row.password))) return res.status(401).json({error:"Invalid login."});
  req.session.userId = row.id;
  res.json({ok:true,user:user(req)});
});
app.post("/api/logout",(req,res)=>{req.session = null; res.json({ok:true});});

app.get("/api/products",(req,res)=>{
  const category = req.query.category;
  const rows = category ? db.prepare("SELECT * FROM products WHERE active=1 AND category=? ORDER BY id DESC").all(category)
                         : db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all();
  res.json({products:rows});
});

app.post("/api/messages", requireAuth, (req,res)=>{
  const receiver = db.prepare("SELECT id FROM users WHERE username=?").get(req.body.username);
  if (!receiver) return res.status(404).json({error:"User not found"});
  const body = String(req.body.body||"").trim().slice(0,2000);
  if (!body) return res.status(400).json({error:"Message cannot be empty"});
  db.prepare("INSERT INTO messages(sender_id,receiver_id,body) VALUES(?,?,?)").run(req.session.userId,receiver.id,body);
  res.json({ok:true});
});
app.get("/api/messages/:username", requireAuth, (req,res)=>{
  const other = db.prepare("SELECT id,username,avatar FROM users WHERE username=?").get(req.params.username);
  if (!other) return res.status(404).json({error:"User not found"});
  const rows = db.prepare(`
    SELECT m.id,m.body,m.created_at,u.username,u.avatar
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
    ORDER BY m.id ASC LIMIT 200
  `).all(req.session.userId,other.id,other.id,req.session.userId);
  res.json({other,messages:rows});
});

app.post("/api/orders", requireAuth, (req,res)=>{
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({error:"Cart is empty"});
  let total=0, clean=[];
  const get = db.prepare("SELECT * FROM products WHERE id=? AND active=1");
  for (const item of items) {
    const p=get.get(Number(item.id)), q=Math.max(1,Math.min(20,Number(item.quantity)||1));
    if (!p || p.stock < q) return res.status(400).json({error:"A product is unavailable or out of stock."});
    total += p.price_cents*q; clean.push({p,q});
  }
  const create = db.transaction(()=>{
    const order=db.prepare("INSERT INTO orders(user_id,total_cents) VALUES(?,?)").run(req.session.userId,total);
    const add=db.prepare("INSERT INTO order_items(order_id,product_id,quantity,price_cents) VALUES(?,?,?,?)");
    for (const x of clean) add.run(order.lastInsertRowid,x.p.id,x.q,x.p.price_cents);
    return order.lastInsertRowid;
  });
  res.json({ok:true,orderId:create()});
});

app.get("/api/orders", requireAuth, (req,res)=>{
  const rows=db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC").all(req.session.userId);
  res.json({orders:rows});
});

app.get("/api/admin/stats", requireAdmin,(req,res)=>{
  res.json({
    users:db.prepare("SELECT COUNT(*) c FROM users").get().c,
    products:db.prepare("SELECT COUNT(*) c FROM products WHERE active=1").get().c,
    orders:db.prepare("SELECT COUNT(*) c FROM orders").get().c,
    revenue:db.prepare("SELECT COALESCE(SUM(total_cents),0) c FROM orders WHERE status!='cancelled'").get().c
  });
});
app.get("/api/admin/users",requireAdmin,(req,res)=>res.json({users:db.prepare("SELECT id,username,role,created_at FROM users ORDER BY id DESC").all()}));
app.post("/api/admin/products",requireAdmin,(req,res)=>{
  const {name,description,priceCents,category,image,stock}=req.body;
  if(!name||!description||!category||Number(priceCents)<0) return res.status(400).json({error:"Invalid product"});
  const info=db.prepare("INSERT INTO products(name,description,price_cents,category,image,stock) VALUES(?,?,?,?,?,?)")
    .run(name,description,Number(priceCents),category,image||"🎮",Number(stock)||0);
  res.json({ok:true,id:info.lastInsertRowid});
});
app.delete("/api/admin/products/:id",requireAdmin,(req,res)=>{
  db.prepare("UPDATE products SET active=0 WHERE id=?").run(req.params.id);
  res.json({ok:true});
});
app.get("/api/admin/orders",requireAdmin,(req,res)=>res.json({orders:db.prepare(`
  SELECT o.*,u.username FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC
`).all()}));

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Conquering The Games running at http://localhost:${PORT}`));
