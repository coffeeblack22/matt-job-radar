# Matt's Job Radar

Auto-refreshing job dashboard. Scrapes Indeed RSS + LinkedIn guest API twice daily, scores listings against your profile, tracks applications. No API keys required, no database, no monthly cost.

## What It Does

- **Auto-scrapes** Indeed RSS feeds and LinkedIn job search every day at 8 AM and 4 PM ET
- **Scores** each listing HIGH / MED / LOW against keyword matches (Series 7, wealth management, financial planning, etc.)
- **De-duplicates** by stable hash of company + title + location — same job never appears twice
- **Tracks applications** in browser localStorage — applied jobs vanish from the active feed permanently
- **Hide irrelevant** roles so they never reappear

## Deploy to Netlify (5 min)

### Step 1: Push to GitHub
```bash
cd job-tracker
git init
git add .
git commit -m "Initial commit"
gh repo create matt-job-radar --public --push
```
*Or upload the folder manually to a new GitHub repo.*

### Step 2: Connect to Netlify
1. Go to https://app.netlify.com
2. Click **Add new site → Import an existing project**
3. Pick GitHub and select `matt-job-radar`
4. Netlify auto-detects the build settings from `netlify.toml`. Just click **Deploy**
5. After ~1 min you get a URL like `https://matt-job-radar.netlify.app`

### Step 3: Verify the scheduled function
1. In Netlify dashboard → **Functions** tab
2. Find `fetch-jobs` — confirm it shows the schedule `0 12,20 * * *`
3. Click **Invoke** to run it manually once and seed initial data

### Step 4: Bookmark the URL
Open `https://matt-job-radar.netlify.app` on your phone, add to home screen for one-tap access.

## Customizing the Search

Edit `netlify/functions/fetch-jobs.js`:

- `SEARCHES` — array of query/location pairs to scrape
- `KEYWORDS_HIGH` — words that boost a listing to HIGH fit
- `KEYWORDS_MED` — words that flag a listing as MED fit
- `KEYWORDS_NEGATIVE` — words that auto-downgrade to LOW (trainee, intern, etc.)

After editing, push to GitHub. Netlify auto-redeploys.

## How De-Duplication Works

Each listing gets an ID hashed from `company + title + location`. The hash is deterministic — the same job at the same company always produces the same ID. Once you mark a listing Applied, it's stored in your browser's localStorage and filtered out of the active feed forever, even if the scraper picks it up again tomorrow.

To reset: open browser DevTools → Application → Local Storage → delete the `matt_jobs_*` keys.

## Cost

$0/month. Netlify's free tier includes:
- 100GB bandwidth
- 125k function invocations
- Scheduled functions
- Custom domain support

This app uses ~60 invocations/month (2 scrapes/day × 30 days).
