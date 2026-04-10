export default async function handler(req, res) {
    const username = req.query.username?.replace('@', '') || '';

    const response = await fetch(
      `https://gkvmqswhwukfigfjbqup.supabase.co/rest/v1/social_profiles?username=eq.${username}&select=username,display_name,bio,avatar_url`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        }
      }
    );

    const data = await response.json();
    const profile = data[0];

    const name = profile?.display_name || username;

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${name} on Novra</title>
    <meta property="og:title" content="${name} on Novra" />
    <meta property="og:description" content="Follow my fitness journey — workouts, nutrition & physique tracking." />
    <meta property="og:image" content="https://www.novra.fit/og-logo.png" />
    <meta property="og:image:width" content="400" />
    <meta property="og:image:height" content="400" />
    <meta property="og:site_name" content="Novra" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="https://www.novra.fit/og-logo.png" />
    <script>window.location.href = "https://apps.apple.com/us/app/novra-calorie-counter/id6760242259";</script>
  </head>
  <body></body>
  </html>`);
  }
