import ZooKeeper from 'zookeeper';

const host = 'localhost:2181';
const tokenPath = '/token';

function createClient(timeoutMs = 5000) {
  const config = {
    connect: host,
    timeout: timeoutMs,
    debug_level: ZooKeeper.constants.ZOO_LOG_LEVEL_WARN,
    host_order_deterministic: false,
  };

  return new ZooKeeper(config);
}

const zkClient = createClient();

export const range = {
  start: 0,
  end: 0,
  curr: 0,
};

export const hashGenerator = (n: number) => {
  let hash = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let hash_str = '';

  while (n > 0) {
    hash_str += hash[n % 62];
    n = Math.floor(n / 62);
  }

  return hash_str;
};

const setTokenRange = async (token: number) => {
  let dataToSet = Buffer.from(String(token), 'utf8');

  try {
    const stat = await zkClient.exists(tokenPath, false);
    await zkClient.set(tokenPath, dataToSet, stat.version);
  } catch (error) {
    console.log(error);
    return;
  }

  console.log('Data is set.');
};

export const getTokenRange = async () => {
  try {
    const [stat, data] = await zkClient.get(tokenPath, false);
    console.log(
      `Data retrieved from path ${tokenPath}:`,
      data.toString('utf8')
    );
    range.start = parseInt(data.toString('utf8')) + 1000000;
    range.curr = parseInt(data.toString('utf8')) + 1000000;
    range.end = parseInt(data.toString('utf8')) + 2000000;
    await setTokenRange(range.start);
    return data.toString('utf8');
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
};

const createToken = async () => {
  let buffer = Buffer.from('0', 'utf8');

  try {
    const path = await zkClient.create(
      tokenPath,
      buffer,
      ZooKeeper.constants.ZOO_PERSISTENT
    );
    console.log('Node: %s is created.', path);
  } catch (error) {
    if (error) {
      console.log(error);
      return;
    }
  }
};

const checkIfTokenExists = async () => {
  try {
    const stat = await zkClient.exists(tokenPath, false);
    if (stat) {
      console.log('Node exists: %s', stat);
    } else {
      createToken();
    }
  } catch (error) {
    console.log(error);
    return;
  }
};

export const removeToken = async () => {
  try {
    const stat = await zkClient.exists(tokenPath, false);
    zkClient.delete_(tokenPath, stat.version);
    console.log('Node is deleted.');
  } catch (error) {
    if (error) {
      console.log(error);
      return;
    }
  }
};

export const connectZK = async () => {
  zkClient.on('connect', () => {
    console.log('Connected to the ZK server.');
    checkIfTokenExists();
    getTokenRange();
    console.log('hello', range.start);
  });

  zkClient.init({});
};

