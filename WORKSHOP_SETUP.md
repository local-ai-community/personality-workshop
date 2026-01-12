# Workshop Setup Guide for 80 Concurrent Users

## Database Configuration

For 80 concurrent users with current SSE implementation, you need to configure PostgreSQL properly based on your hosting provider.

### If using Railway.com

📄 **See complete guide**: `RAILWAY_SETUP.md`

**Quick Setup:**

1. Add to Railway PostgreSQL service variables:
   ```
   POSTGRES_MAX_CONNECTIONS=200
   DATABASE_URL=${{Postgres.DATABASE_URL}}?pgbouncer=true
   ```

2. Required plan: **Basic ($10/mo)** or higher (supports ~90 connections)

3. Verify after redeploy:
   ```bash
   psql $DATABASE_URL -c "SHOW max_connections;"
   ```

---

### If using Supabase

**Important**: Supabase manages connections automatically based on your plan:
- Free plan: 60 connections max ❌ (Not enough for 80 users)
- Pro plan: 500 connections max ✅

**Setup for 80 users:**

1. **Use PgBouncer** (Required for production)
   Add `?pgbouncer=true` to your DATABASE_URL in `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true
   ```

2. **Upgrade to Pro plan** if on Free tier
   - Free plan limits to 60 connections
   - Pro plan allows 500 connections
   - Pro plan: $25/month, fully supports 80 users

3. **Alternative**: Use Supabase Realtime
   - Built-in WebSocket subscriptions
   - No connection limits
   - More reliable for workshops

### If using Self-Hosted PostgreSQL

Edit your PostgreSQL configuration file (`postgresql.conf`):

```bash
# Increase maximum connections
max_connections = 200

# Connection timeout
statement_timeout = 30000
idle_in_transaction_session_timeout = 60000
```

**Why These Settings:**

- **max_connections = 200**: Each of 80 users needs 1 persistent LISTEN connection, plus your connection pool (10), plus buffer for other queries
- **statement_timeout**: Prevents stuck connections
- **idle_in_transaction_session_timeout**: Cleans up abandoned transactions

### Connection Requirements by User Count

| Users | LISTEN Connections | Pool Connections | Total Needed | Hosting |
|--------|-------------------|------------------|--------------|----------|
| 50     | 50                | 10               | 60           | Free Supabase ❌ |
| 80     | 80                | 10               | 90           | Pro Supabase ✅ |
| 150    | 150               | 10               | 160          | Pro Supabase ✅ |

## Scalability Limits

### Current Implementation

| Concurrent Users | Database Connections | Estimated CPU | Status |
|-----------------|---------------------|---------------|---------|
| 50              | 70                  | Low           | ✅ Reliable |
| 80              | 100                 | Medium        | ✅ Reliable |
| 100             | 120                 | Medium-High   | ⚠️ Monitor |
| 150+            | 170+                | High          | ❌ At limit |

### Optimizations Applied

1. **NOTIFY/LISTEN**: Zero polling overhead (was 16 queries/second)
2. **Single Client per User**: Each SSE has dedicated DB connection
3. **Auto-Reconnect**: Clients reconnect with exponential backoff
4. **Keep-Alive**: Prevents idle connection timeouts

## Monitoring

### Railway Monitoring

Check your Railway dashboard for:
- **Postgres Service**: CPU, Memory, Connection count
- **Web Service**: Response times, Error rate

Active connections query:
```sql
-- In Railway's SQL editor
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

Railway shows live metrics at: `https://railway.app/project/<your-project>`

### Key Metrics to Watch

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('your_db_name'));

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Client-Side Health Check

The results page shows:
- **Green pulsing dot** = Connected and receiving updates
- **Red dot** = Disconnected (auto-reconnecting)

## Troubleshooting

### Users Getting Connection Errors

**Symptom**: Users see "Connection refused" or errors

**Solution**:
1. Check PostgreSQL max_connections setting
2. Verify DATABASE_URL has correct connection string
3. Check database logs for connection limits

### Some Users Not Seeing Updates

**Symptom**: Updates not appearing for specific users

**Solution**:
1. User's browser has network issue (check WiFi)
2. SSE connection dropped - wait for auto-reconnect (up to 32 seconds)
3. Browser prevents SSE (rare, check extensions)

### High CPU Usage

**Symptom**: Database or server CPU spiking

**Solution**:
1. Check if too many users (over 150)
2. Add database indexes (already included in schema.sql)
3. Consider adding Redis pub/sub for scale > 200 users

## Deployment Checklist

- [ ] PostgreSQL max_connections set to 200+
- [ ] DATABASE_URL environment variable set
- [ ] Database indexes created (run schema.sql)
- [ ] SSL enabled for production (Supabase does this automatically)
- [ ] Monitor connection count during first workshop
- [ ] Test with 5-10 users before full workshop

## Scaling Beyond 200 Users

For larger workshops (200+ users), consider:

1. **Redis Pub/Sub**: Offload notifications from PostgreSQL
2. **Connection Pooling**: Use PgBouncer for LISTEN connections
3. **Horizontal Scaling**: Multiple app instances with shared Redis
