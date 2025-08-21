// server/src/services/storage.service.js
const { supabaseAdmin } = require('../config/supabase');

async function uploadReportFile(buffer, pathInBucket, contentType, { signedSeconds = 0 } = {}) {
  const { error } = await supabaseAdmin
    .storage
    .from('reports')
    .upload(pathInBucket, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Public buckets: just return public URL; private buckets: return signed URL if requested.
  if (signedSeconds > 0) {
    const { data, error: signErr } =
      await supabaseAdmin.storage.from('reports').createSignedUrl(pathInBucket, signedSeconds);
    if (signErr) throw new Error(`Signed URL failed: ${signErr.message}`);
    return { path: pathInBucket, url: data.signedUrl, signed: true };
  }

  const { data: pub } = supabaseAdmin.storage.from('reports').getPublicUrl(pathInBucket);
  return { path: pathInBucket, url: pub?.publicUrl || null, signed: false };
}

module.exports = { uploadReportFile };
