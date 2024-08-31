import Redis from 'ioredis';
// import ShortURL from '../models/url' // Make sure this model is properly typed

class Queue<T> {
    private items: T[];

    constructor() {
        this.items = [];
    }

    enqueue = async (element: T): Promise<void> => {
        if (this.size() < 10) {
            this.items.push(element);
        } else {
            while (!this.isEmpty()) {
                try {
                    const hash = this.dequeue();
                    if (hash) {
                        await ShortURL.findOneAndUpdate(
                            { Hash: hash },
                            { $inc: { Visits: 1 } }
                        );
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    };

    dequeue(): T | undefined {
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
