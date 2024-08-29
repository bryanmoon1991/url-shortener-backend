import { Elysia } from 'elysia';

const app = new Elysia()
  .post('/shorten', ({ body }) => {
    const { url } = body;
    
    // Generate a short code
    const shortCode = Math.random().toString(36).substring(2, 8);

    // Store the mapping in Redis
    // await redis.set(shortCode, url);

    // // Store the mapping in Supabase for persistence
    // const { error } = await supabase
    //     .from('urls')
    //     .insert([{ short_code: shortCode, url: url }]);

    // if (error) throw error;

    return { shortCode };
  })
  .get('/:shortcode', ({ redirect, params: { shortcode } }) => {
    //check redis for shortcode
    //if shortcode exists, redirect to it
    //if shortcode doesn't exist, fetch from supabase
    //save shortcode to redis
    //redirect to shortcode
  })
  .listen(4000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
