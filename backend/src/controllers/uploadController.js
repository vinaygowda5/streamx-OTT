const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { ok, err } = require("../utils/response");

// R2 is S3-compatible — same SDK, different endpoint. Credentials live only
// here, server-side. The frontend never sees R2_SECRET_ACCESS_KEY.
function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// POST /api/content/upload-url  { filename, contentType }
// Returns a presigned PUT URL valid for 10 minutes, plus the final public URL.
// The browser then PUTs the raw file bytes straight to R2 — no size limit,
// no Railway bandwidth cost, no secret exposed.
async function getUploadUrl(req, res) {
  const { filename, contentType } = req.body;
  if (!filename) return err(res, "filename required");
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_BUCKET_NAME) {
    return err(res, "R2 is not configured on the server yet (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_BUCKET_NAME env vars)", 503);
  }
  try {
    const key = `videos/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${filename.replace(/\s/g,"_")}`;
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return ok(res, { uploadUrl, publicUrl, key });
  } catch (e) {
    console.error("R2 presign error:", e);
    return err(res, "Could not generate upload URL: " + e.message, 500);
  }
}

module.exports = { getUploadUrl };
