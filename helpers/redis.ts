import Redis from 'ioredis';
import connectSupabase from '../helpers/supabase';

class Queue<T extends string> {
  private items: T[];

  constructor() {
    this.items = [];
  }

  enqueue = async (element: T): Promise<void> => {
    if (this.size() < 10) {
      this.items.push(element);
    } else {
      const supabaseClient = await connectSupabase();
      while (!this.isEmpty()) {
        try {
          const hash = this.dequeue();
          if (hash !== undefined) {

            let { data, error } = await supabaseClient.rpc('increment_url_visits', {
              input_hash: hash,
            });

            if (error) {
              throw error;
            }

            if (!data) {
              console.log(`No URL found with hash: ${hash}`);
            }
          }
        } catch (err) {
          console.error('Error updating visit count:', err);
        }
      }
    }
  };

  dequeue(): string | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  print(): void {
    console.log(this.items.toString());
  }
}

export const jobQueue = new Queue<string>();

export const connectRedis = async (): Promise<Redis> => {
  return new Redis({
    host: process.env.REDIS_HOST as string,
    port: parseInt(process.env.REDIS_PORT as string, 10),
  });
};
