# Cheers to (to be) Dr. Tiffany

A one-page PhD celebration site where friends and colleagues can leave congratulations and upload photos.

## Preview

Open `index.html` in a browser to preview the page locally. Without Supabase details, the form runs in local preview mode: submissions appear only in the current browser.

## Shared Entries With Supabase

To make everyone's messages and photos sync on the website:

1. Create a free Supabase project.
2. In Supabase, open the SQL editor and run the contents of `supabase-schema.sql`.
3. In Supabase, go to Project Settings, then API.
4. Copy the Project URL and anon public key into `supabase-config.js`.
5. Deploy this folder to a static host such as Netlify, Vercel, or GitHub Pages.

The page will then:

- Load existing messages and photos for every visitor.
- Save new messages to the `messages` table.
- Upload photos to the public `celebration-photos` storage bucket.
- Listen for new entries so visitors see updates without refreshing.

## Customize

- Change the name in `index.html` if Tiffany prefers a different display name.
- Replace the hero text or stats with personal details.
- Replace `assets/tiffany.jpg` if you want a different front photo.
