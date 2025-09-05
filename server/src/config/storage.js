// server/src/config/storage.js
const { supabaseAdmin } = require('./supabase');

async function ensureReportsBucket({ publicBucket = true } = {}) {
  const bucketName = 'reports';

  // Check if bucket exists
  const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    console.error('[storage] listBuckets failed:', listErr.message);
    return;
  }
  const exists = (buckets || []).some(b => b.name === bucketName);

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: publicBucket, // public for dev; flip to false for prod
      // allowedMimeTypes: ['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    });
    if (error) console.error(`[storage] createBucket("${bucketName}") failed:`, error.message);
    else console.log(`[storage] bucket "${bucketName}" created (public=${publicBucket}).`);
  } else {
    const { error } = await supabaseAdmin.storage.updateBucket(bucketName, {
      public: publicBucket,
    });
    if (error) console.error(`[storage] updateBucket("${bucketName}") failed:`, error.message);
    else console.log(`[storage] bucket "${bucketName}" ensured (public=${publicBucket}).`);
  }
}

module.exports = { ensureReportsBucket };
