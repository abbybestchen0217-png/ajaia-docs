Ajaia Docs
A lightweight collaborative document editor built with Next.js, TipTap, Prisma, and Supabase.
Live Demo
https://ajaia-docs-qyjm.vercel.app
Test accounts:
NameEmailAlicealice@test.comBobbob@test.comCarolcarol@test.com
Features

Create, rename, edit, and delete documents
Rich text formatting: Bold, Italic, Underline, Headings, Bullet lists, Numbered lists
Auto-save (1 second debounce)
Upload .txt or .md files to create new documents
Share documents with other users
Documents list shows "My Documents" and "Shared with Me" separately

Local Setup
Prerequisites

Node.js 18+
A PostgreSQL database (Supabase free tier recommended)

Steps
bashgit clone https://github.com/abbybestchen0217-png/ajaia-docs.git
cd ajaia-docs
npm install
Create a .env file:
DATABASE_URL="your_postgresql_connection_string"
Run database migrations and seed:
bashnpx prisma migrate deploy
npx prisma db seed
Start the development server:
bashnpm run dev
Open http://localhost:3000
Supported file upload formats
.txt and .md only. .docx parsing is not supported in this version.
Tech Stack

Frontend/Backend: Next.js 16 (App Router)
Editor: TipTap
Database ORM: Prisma 7
Database: PostgreSQL (Supabase)
Deployment: Vercel
