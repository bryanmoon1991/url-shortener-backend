import { Elysia, t } from 'elysia';
import {
  range,
  hashGenerator,
  getTokenRange,
  removeToken,
} from '../helpers/zookeeper';
import connectSupabase from '../helpers/supabase';
import { connectRedis, jobQueue } from '../helpers/redis';

const app = new Elysia()
  .post(
    '/shorten',
    async ({ body, set }) => {
      if (range.curr < range.end - 1 && range.curr != 0) {
        range.curr++;
      } else {
        await getTokenRange();
        range.curr++;
      }
      console.log(range.curr);
  
      const redisClient = await connectRedis();
      
      try {
        const redisResult = await new Promise<string | null | undefined>((resolve, reject) => {
          redisClient.get(body.originalUrl, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
  
        if (redisResult) {
          return { hash: redisResult };
        }
  
        const supabaseClient = await connectSupabase();
  
        const { data, error } = await supabaseClient
          .from('urls')
          .select('*')
          .eq('original_url', body.originalUrl)
          .limit(1);
  
        if (error) throw error;
  
        if (data && data.length > 0) {
          const record = data[0];
          await new Promise<void>((resolve) => {
            redisClient.set(record.original_url, record.hash, "EX", 600)
          });
          return { hash: record.hash };
        } else {
          const newHash = hashGenerator(range.curr - 1);
          const { data: insertData, error: insertError } = await supabaseClient
            .from('urls')
            .insert({
              hash: newHash,
              original_url: body.originalUrl,
              visits: 0,
              created_at: new Date().toISOString(),
              expires_at: new Date(
                new Date().getTime() + 365 * 24 * 60 * 60 * 1000
              ).toISOString(),
            })
            .select();
  
          if (insertError) throw insertError;
  
          if (insertData && insertData.length > 0) {
            const record = insertData[0];
            await new Promise<void>((resolve) => {
              redisClient.set(record.original_url, record.hash, "EX", 600);
            });
            return { hash: record.hash };
          }
        }
  
        set.status = 500;
        return { error: 'Failed to create or retrieve short URL' };
      } catch (error) {
        console.error(error);
        set.status = 500;
        return { error: 'Internal Server Error' };
      }
    },
    {
      body: t.Object({
        originalUrl: t.String(),
      }),
      response: t.Union([
        t.Object({
          hash: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )
  .get(
    '/:shortcode',
    async ({ params: { shortcode }, set, redirect }) => {
      const redisClient = await connectRedis();

      try {
        // Promisify Redis get operation
        const redisResult = await new Promise<string | null | undefined>(
          (resolve, reject) => {
            redisClient.get(shortcode, (err, res) => {
              if (err) reject(err);
              else resolve(res);
            });
          }
        );

        if (redisResult) {
          await new Promise<void>(() => {
            jobQueue.enqueue(shortcode);
          });
          return redirect(redisResult, 302);
        }

        const supabaseClient = await connectSupabase();

        const { data, error } = await supabaseClient
          .from('urls')
          .select('*')
          .eq('hash', shortcode)
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const record = data[0];
          await Promise.all([
            new Promise<void>((resolve) => {
              redisClient.set(record.hash, record.original_url, 'EX', 600);
            }),
            new Promise<void>(() => {
              jobQueue.enqueue(record.hash);
            }),
          ]);
          return redirect(record.original_url, 302);
        }

        set.status = 404;
        return { error: 'URL not found' };
      } catch (error) {
        console.error(error);
        set.status = 500;
        return { error: 'Internal Server Error' };
      }
    },
    {
      params: t.Object({
        shortcode: t.String(),
      }),
    }
  )
  .listen(4000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
