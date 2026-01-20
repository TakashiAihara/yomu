import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

interface MigrationMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    schemaVersion?: string;
    error?: string;
}

/**
 * Execute database migrations with advisory lock for concurrency control
 * 
 * Features:
 * - PostgreSQL advisory locks prevent concurrent migrations
 * - Observability metrics (duration, success/fail, schema version)
 * - Structured logging for monitoring
 * - Alert on migrations exceeding 30s
 */
export async function runMigrations(): Promise<void> {
    const metrics: MigrationMetrics = {
        startTime: Date.now(),
        success: false,
    };

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    // Create connection for advisory lock
    const lockClient = postgres(DATABASE_URL, { max: 1 });

    // Create connection for migrations
    const migrationClient = postgres(DATABASE_URL, { max: 1 });

    try {
        console.log('[Migration] Starting database migration...');
        console.log(`[Migration] Timestamp: ${new Date().toISOString()}`);

        // Acquire PostgreSQL advisory lock (lock ID: 123456789)
        // This prevents concurrent migrations from running
        console.log('[Migration] Acquiring advisory lock...');
        const lockResult = await lockClient`SELECT pg_try_advisory_lock(123456789) as acquired`;

        if (!lockResult[0]?.acquired) {
            throw new Error('Failed to acquire advisory lock - another migration may be running');
        }

        console.log('[Migration] Advisory lock acquired successfully');

        // Run migrations
        const db = drizzle(migrationClient);
        console.log('[Migration] Executing migrations...');

        await migrate(db, { migrationsFolder: './drizzle' });

        // Get current schema version from migrations table
        try {
            const versionResult = await migrationClient`
        SELECT hash FROM __drizzle_migrations__ 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
            metrics.schemaVersion = versionResult[0]?.hash || 'unknown';
        } catch (error) {
            console.warn('[Migration] Could not retrieve schema version:', error);
            metrics.schemaVersion = 'unknown';
        }

        metrics.success = true;
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;

        // Log success metrics
        console.log('[Migration] ✅ Migration completed successfully');
        console.log(`[Migration] Duration: ${metrics.duration}ms`);
        console.log(`[Migration] Schema version: ${metrics.schemaVersion}`);

        // Alert if migration took longer than 30 seconds
        if (metrics.duration > 30000) {
            console.warn(`[Migration] ⚠️  ALERT: Migration exceeded 30s threshold (${metrics.duration}ms)`);
        }

    } catch (error) {
        metrics.success = false;
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.error = error instanceof Error ? error.message : String(error);

        // Log failure metrics
        console.error('[Migration] ❌ Migration failed');
        console.error(`[Migration] Duration: ${metrics.duration}ms`);
        console.error(`[Migration] Error: ${metrics.error}`);

        throw error;
    } finally {
        // Release advisory lock
        try {
            await lockClient`SELECT pg_advisory_unlock(123456789)`;
            console.log('[Migration] Advisory lock released');
        } catch (error) {
            console.error('[Migration] Failed to release advisory lock:', error);
        }

        // Close connections
        await lockClient.end();
        await migrationClient.end();

        // Log final metrics summary
        console.log('[Migration] Metrics Summary:', JSON.stringify({
            duration_ms: metrics.duration,
            success: metrics.success,
            schema_version: metrics.schemaVersion,
            timestamp: new Date().toISOString(),
        }));
    }
}

// Execute migrations if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations()
        .then(() => {
            console.log('[Migration] Process completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Migration] Process failed:', error);
            process.exit(1);
        });
}
