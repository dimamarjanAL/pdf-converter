const S3 = require("aws-sdk/clients/s3");

const {
  AWS_STORAGE_BUCKET,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_PROJECT_REGION,
  APP_PROD_LINK,
} = process.env;

const s3 = new S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: AWS_PROJECT_REGION,
  signatureVersion: "v4",
});

exports.uploadFileToS3 = async ({ file, fileKey }) => {
  const s3Params = {
    Bucket: `${AWS_STORAGE_BUCKET}/public`,
    Key: fileKey,
    Expires: 60,
    ContentType: file.mimeType,
  };

  const uploadUrl = s3.getSignedUrl("putObject", s3Params);

  await fetch(uploadUrl, { method: "PUT", body: file.buffer });

  return `${APP_PROD_LINK}/download/${encodeURIComponent(fileKey)}`;
};

exports.removeFileFromS3 = async ({ fileKey }) => {
  const s3Params = {
    Bucket: `${AWS_STORAGE_BUCKET}/public`,
    Key: fileKey,
  };

  s3.deleteObject(s3Params, (_err, _data) => {});
};
