# Street search deployment

Local development can use the public Nominatim provider with a bounded single-request queue and one-second cooldown. Concurrent excess requests return HTTP 429 rather than building an unbounded queue.

On Vercel, public Nominatim requests require `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. The shared store holds a 24-hour cache, a 20-request/minute client limit, and an upstream lease with a cooldown across instances. IP bucket keys are salted hashes and expire after a minute. Provider credentials remain server-only.

Alternatively set `STREET_GEOCODER_URL` to a dedicated Nominatim-compatible provider with suitable capacity and terms. Without either configuration, Vercel returns `STREET_CONFIGURATION_REQUIRED` (503) instead of sending uncoordinated traffic to the public service. Other map functions remain available.

The Redis adapter uses the documented [Upstash REST command API](https://upstash.com/docs/redis/features/restapi). No store was provisioned during this change. Configure credentials and run an integration check before production deployment. Do not copy credentials into the repository.
