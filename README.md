# LucidOS

An online desktop operating system I have been creating. It features built-in applications, a desktop application launcher, file system, login system, and its own programming language (Lucid Script), allowing users to create and install small applications which work within LucidOS, currently other programming languages are planned in LucidOS2.

test it out at https://snetchy09.github.io/LucidOS/

also  the payment for LucidOS+ is in test mode , dont try to puy your real infos , you can contact me at daliyoucefiyad2009@gmail.com to enable it for you.

## What's inside

a desktop – draggable windows, app launcher, taskbar with settings shortcut and a clock
a file system backed by IndexedDB, enabling files to be stored
support for Supabase authentication (account creation and log-in)
**Lucid Script** – a custom programming language designed to create applications inside LucidOS. There are no semicolons and classes, please refer to the studio docs for a full documentation.
**Lucid Studio** – an online editor for scripting Lucid Script applications, which allows seeing a preview and clicking "Publish".
a store where users can see the applications after being approved.
some built-in applications – notes, calculator, calendar, paint application, terminal, and the browser. (note that will be some bugs so please report them)

## Publishing process

You compose an application in Studio, the app is packed (source code, assets, manifest) and uploaded to Backblaze B2, a row gets generated in Supabase, and I (or another person with reviewing access) accept or decline it.

## Stack

Vanilla JS, no framework for the OS itself (Vite just bundles it)
Supabase for auth + database
Backblaze B2 for storing published app packages
Vercel for the publish API
Lemon Squeezy for the paid tier (test mode)!!

## Running it locally
npm install
npm run dev

You'll need your own Supabase project and B2 bucket if you want auth/publishing to actually work — there's no demo backend included.

## A note on how this was built

I used AI tools while building this — not just for small help, for real chunks of the actual code and a lot of the debugging. i also spent a good chunk of time myself setting up and wiring together the infrastructure (Supabase, B2, Vercel, auth, the publish pipeline) and finding/fixing real bugs across the project. I'd rather say that upfront than have anyone assume otherwise from looking at the code.

## State of things

honestly still rough in places. Lucid Studio can be slow with bigger scripts, the store review flow works but there's no proper admin UI for it yet (just a hidden panel gated behind an account role), and i'm sure there are bugs i haven't found. treat it as a work in progress, not a finished product.

## Why I built it

Wanted to see if I could build something that felt like a whole little world — not just an app, but a place with its own rules, its own language, somewhere other people could eventually build things inside of too!
