const express=require("express"),path=require("path"),fs=require("fs"),crypto=require("crypto");
const bcrypt=require("bcryptjs"),Database=require("better-sqlite3"),cookieSession=require("cookie-session");
const rateLimit=require("express-rate-limit"),multer=require("multer"),nodemailer=require("nodemailer");
const app=express(),PORT=process.env.PORT||3000,DATA=path.join(__dirname,"data"),UPLOADS=path.join(__dirname,"uploads");
fs.mkdirSync(DATA,{recursive:true});fs.mkdirSync(UPLOADS,{recursive:true});
const db=new Database(path.join(DATA,"wcg.db"));db.pragma("journal_mode=WAL");
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE COLLATE NOCASE,email TEXT UNIQUE COLLATE NOCASE,password TEXT,role TEXT DEFAULT 'user',verified INTEGER DEFAULT 0,verify_token TEXT,verify_expires INTEGER,created_at INTEGER);
CREATE TABLE IF NOT EXISTS socials(id INTEGER PRIMARY KEY AUTOINCREMENT,label TEXT,url TEXT,created_at INTEGER);
CREATE TABLE IF NOT EXISTS resellers(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,title TEXT,description TEXT,price TEXT,contact TEXT,created_at INTEGER);
CREATE TABLE IF NOT EXISTS files(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,original_name TEXT,stored_name TEXT,size INTEGER,created_at INTEGER);`);
const adminEmail=process.env.ADMIN_EMAIL||"admin@wcg.local",adminPass=process.env.ADMIN_PASSWORD||"ChangeMe123!";
if(!db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail))db.prepare("INSERT INTO users(username,email,password,role,verified,created_at) VALUES(?,?,?,?,?,?)").run("WCG_Admin",adminEmail,bcrypt.hashSync(adminPass,12),"admin",1,Date.now());
app.use(express.json({limit:"2mb"}));app.use(express.urlencoded({extended:true}));
app.use(cookieSession({name:"wcg_session",keys:[process.env.SESSION_SECRET||"CHANGE_THIS_SECRET"],httpOnly:true,same
