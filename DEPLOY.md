# Deploy to Vercel

## 1. Push to GitHub

Create a new repository on GitHub: https://github.com/new

- Name: `expert-intelligence-platform` (or your choice)
- **Do not** initialize with README, .gitignore, or license (we already have them)

Then run:

```bash
git remote remove origin   # if you added a different URL
git remote add origin https://github.com/YOUR_USERNAME/expert-intelligence-platform.git
git branch -M main
git push -u origin main
```

## 2. Deploy on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables (see `ENV_KEYS_REFERENCE.md` locally – it's gitignored)
4. Deploy

## 3. Post-deploy

- Run `npx prisma migrate deploy` (Vercel runs this automatically via build command, but you can run it manually if needed)
- Add your Vercel URL to Clerk allowed domains
- Update n8n `APP_URL` to your Vercel URL
- Update `NEXT_PUBLIC_APP_URL` in Vercel to your deployed URL
