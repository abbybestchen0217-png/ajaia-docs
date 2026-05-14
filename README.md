# Ajaia Docs

A lightweight collaborative document editor built with Next.js, TipTap, Prisma, and Supabase.

## Live Demo

https://ajaia-docs-qyjm.vercel.app

**Test accounts (no password needed — select from dropdown):**

| Name  | Email          |
|-------|----------------|
| Alice | alice@test.com |
| Bob   | bob@test.com   |
| Carol | carol@test.com |

## Features

- Create, rename, edit, and delete documents
- Rich text formatting: Bold, Italic, Underline, Headings, Bullet lists, Numbered lists
- Auto-save (1 second debounce after typing stops)
- Upload .txt or .md files to create new documents
- Share documents with other users by email
- Document list separates "My Documents" and "Shared with Me"
- Data persists across sessions via PostgreSQL

## Local Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Supabase free tier works)

### Steps

```bash
git clone https://github.com/abbybestchen0217-png/ajaia-docs.git
cd ajaia-docs
npm install
```

Create a `.env` file in the project root:

```
DATABASE_URL="your_postgresql_connection_string"
```

Run database setup:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## File Upload

Supported formats: `.txt` and `.md` only.
`.docx` is not supported in this version (see Architecture Note for reasoning).

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router)
- **Rich Text Editor:** TipTap
- **Database ORM:** Prisma 7
- **Database:** PostgreSQL via Supabase
- **Deployment:** Vercel
