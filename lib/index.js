"use strict";
//@ts-check

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

/**
 * @typedef BucketParams
 * @property {string|undefined} [Bucket]
 * @property {string|undefined} [bucket]
 * @property {string|undefined} [ACL]
 * @property {string|undefined} [acl]
 *
 * @typedef ProviderConfiguration
 * @property {BucketParams} params
 * @property {string} accessKeyId
 * @property {string} secretAccessKey
 * @property {string} region
 * @property {string} [prefix]
 * @property {string} [baseUrl]
 */

/**
 * Removes leading or trailing slashes for url composition in upload or delete functions
 * @param {string} prefix prefix for object keys defined by configuration
 * @returns prefix with removed leading or trailing
 */
function normalizePrefix(prefix) {
  return prefix.trim().replace(/^\/*/, "").replace(/\/*$/, "");
}

/**
 * Composes an FQDN of the given object path with the bucket's Endpoint
 * @param {import("@aws-sdk/types").Endpoint} ep
 * @param {string} bucket
 * @param {string} path
 * @returns composed url with bucket endpoint as string
 */
function composeBucketUrl(ep, bucket, path) {
  return (
    ep.protocol +
    "://" +
    bucket +
    "." +
    ep.hostname +
    (ep.port ? ":" + ep.port : "") +
    "/" +
    path
  );
}

/**
 * composes a (normalized) URL for CDN usage
 * @param {string} url CDN base url
 * @param {string} path object path in CDN
 * @returns CDN url
 */
function composeCDNUrl(url, path) {
  return (url.endsWith("/") ? url : url + "/") + path;
}

module.exports = {
  /**
   * Creates a hoisted S3 client and returns functions for uploading and deleting
   * @param {ProviderConfiguration} config
   * @returns object with upload, uploadStream, and delete function
   */
  init(config) {
    const S3 = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
      ...config,
    });

    const prefix = config.prefix ? normalizePrefix(config.prefix) : "";
    const bucket = config.params.Bucket || config.params.bucket;
    const acl = config.params.ACL || config.params.acl || "public-read";

    const upload = async (file, customParams = {}) => {
      const path = file.path ? `${file.path}/` : ""; // with trailing slash if present, otherwise empty
      const filename = `${file.hash}${file.ext}`; // no leading slash
      const objectPath = "/" + prefix + "/" + path + filename;
      const uploadParams = {
        Bucket: bucket,
        Key: objectPath,
        Body: file.stream || Buffer.from(file.buffer, "binary"),
        ACL: acl,
        ContentType: file.mime,
        ...customParams,
      };
      try {
        // upload file on S3 bucket
        await S3.send(new PutObjectCommand(uploadParams));
        // set the bucket file url
        if (config.baseUrl === undefined) {
          // if no baseUrl provided, use the endpoint returned from S3
          const ep = await S3.config.endpoint();
          file.url = composeBucketUrl(ep, bucket, objectPath);
        } else {
          const baseUrl = config.baseUrl ? `${config.baseUrl}` : "";
          file.url = composeCDNUrl(baseUrl, objectPath);
        }
      } catch (err) {
        console.debug(objectPath, bucket, prefix, path, filename);
        console.error("Error uploading object to bucket", objectPath);
        console.error(err);
        throw err;
      }
    };

    return {
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      // delete file in S3 bucket
      async delete(file, customParams = {}) {
        const path = file.path ? `${file.path}/` : "";
        const filename = `${file.hash}${file.ext}`;
        const objectPath = "/" + prefix + "/" + path + filename;
        try {
          await S3.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: objectPath,
              ...customParams,
            })
          );
        } catch (err) {
          console.error("Error deleting object from bucket", objectPath);
          console.error(err);
          throw err;
        }
      },
    };
  },
};
