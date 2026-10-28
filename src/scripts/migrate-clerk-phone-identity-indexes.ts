import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

const nodeEnv = (process.env.NODE_ENV || 'dev').toLowerCase();
loadEnv({ path: resolve(process.cwd(), `.env.${nodeEnv}`), override: false });
loadEnv({ path: resolve(process.cwd(), '.env'), override: false });

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI must be set before running this migration');

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('MONGO_URI must be a valid MongoDB connection string');
  }
  if (!databaseName) {
    throw new Error(
      'MONGO_URI must include the target database name in its path; refusing to use MongoDB default database',
    );
  }

  const connection = await mongoose.createConnection(uri).asPromise();
  try {
    const collection = connection.db!.collection('users');
    const collectionExists = await connection
      .db!.listCollections({ name: 'users' }, { nameOnly: true })
      .hasNext();
    const duplicateGroups = collectionExists
      ? await Promise.all([
          collection
            .aggregate([
              { $match: { email: { $type: 'string' } } },
              { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 } } },
              { $match: { count: { $gt: 1 } } },
              { $limit: 10 },
            ])
            .toArray(),
          collection
            .aggregate([
              { $match: { clerkId: { $type: 'string' } } },
              { $group: { _id: '$clerkId', count: { $sum: 1 } } },
              { $match: { count: { $gt: 1 } } },
              { $limit: 10 },
            ])
            .toArray(),
        ])
      : [[], []];

    if (duplicateGroups.some((groups) => groups.length > 0)) {
      throw new Error(
        `Duplicate identity values found; no indexes were changed. ` +
          `Email duplicates: ${duplicateGroups[0].length}; Clerk ID duplicates: ${duplicateGroups[1].length}.`,
      );
    }

    const indexes = collectionExists ? await collection.indexes() : [];
    const indexesToReplace = indexes.filter((index) => {
      const keys = Object.keys(index.key ?? {});
      return keys.length === 1 && (keys[0] === 'email' || keys[0] === 'clerkId');
    });

    if (!process.argv.includes('--apply')) {
      console.log(
        `Dry run: duplicate check passed${collectionExists ? '' : '; users collection is absent'}. ` +
          `Would replace ${indexesToReplace.length} email/Clerk ID index(es). ` +
          'Re-run with --apply to update indexes.',
      );
      return;
    }

    for (const index of indexesToReplace) {
      if (index.name) {
        console.log(`Dropping index ${index.name}...`);
        await collection.dropIndex(index.name);
      }
    }
    console.log('Creating unique email index...');
    await collection.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
        name: 'email_unique',
      },
    );
    console.log('Creating unique Clerk ID index...');
    await collection.createIndex(
      { clerkId: 1 },
      {
        unique: true,
        partialFilterExpression: { clerkId: { $type: 'string' } },
        name: 'clerkId_unique',
      },
    );
    console.log('Clerk phone identity indexes updated successfully.');
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
