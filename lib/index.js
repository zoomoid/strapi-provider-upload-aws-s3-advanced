// @ts-check
"use strict";

/**
 * @typedef BucketParams
 * @type {object}
 * @property {string} [bucket] bucket name. Takes precedence over Params.Bucket!
 * @property {string} [Bucket] bucket name, but uppercase
 *
 * @typedef Params
 * @type {Object.<string, any> & BucketParams}
 *
 * @typedef Configuration Plugin configuration, containing S3 Client config
 * @type {object}
 * @property {string} accessKeyId AWS_ACCESS_KEY_ID
 * @property {string} secretAccessKey AWS_SECRET_ACCESS_KEY
 * @property {string} region AWS_REGION
 * @property {string} baseUrl base url for the final file to be served from
 * @property {string} prefix bucket prefix
 * @property {Params} params additional params for the S3 client
 *
 * @typedef Relation Internal strapi relation object. Not directly needed by this plugin!
 * @type {object}
 * @property {number} id relation id
 * @property {Object} __type relation types
 * @property {Object} __pivot relation pivots

 * @typedef File Strapi File object passed through the service stack to the provider's functions
 * @type {object}
 * @property {string} [name] filename, either derived from file, or user-provided
 * @property {string} [alternativeText] user-provider alternative text (e.g., for images)
 * @property {string} [caption] user-provided file caption
 * @property {string} hash filename + random characters for uniqueness
 * @property {string} ext file extension
 * @property {string} mime mime type
 * @property {string} [path] meta information
 * @property {number} [width] image width after optimization
 * @property {number} [height] image height after optimization
 * @property {number} [size] File size in KBytes
 * @property {Buffer|any} buffer file buffer
 * @property {import("stream").Stream} stream file stream
 * @property {string} [url] final url from which to deliver a file
 * @property {Relation[]} related relationship information
 */

const { join } = require("path");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

module.exports = {
  /**
   * Binds the plugin's configuration into functions required by the strapi upload service
   * @param {Configuration} config
   * @returns object containing upload and delete functions for strapi's upload service
   */
  init(config) {
    // create a S3 client and keep it in the closure of upload/delete
    const S3 = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
      ...config,
    });

    return {
      /**
       * Uploads a file to the configured bucket and sets the file's url property to the alternate URL, e.g., your CDN
       * @param {File} file File object to upload, with metadata
       * @param {*} customParams additional configuration, currently unused by strapi
       */
      async upload(file, customParams = {}) {
        let prefix = `${config.prefix}` || "";

        // TODO(refactor): "path" seems to only be a local object, not relevant for the upload path itself
        // file.hash already contains the file's name
        const objectPath = join(
          prefix,
          file.path || "",
          `${file.hash}${file.ext}`
        );
        const uploadParams = {
          Bucket: config.params.bucket || config.params.Bucket,
          Key: objectPath,
          Body: Buffer.from(file.buffer, "binary"),
          // TODO(fix): this currently breaks uploads
          // ACL: 'public-read',
          ContentType: file.mime,
          ...customParams,
        };
        try {
          // upload file on S3 bucket
          await S3.send(new PutObjectCommand(uploadParams));

          // set the bucket file url
          if (config.baseUrl) {
            file.url = join(`${config.baseUrl}`, objectPath);
          } else {
            // if no baseUrl provided, use the endpoint returned from S3
            const ep = await S3.config.endpoint();
            file.url = join(
              `${ep.protocol}://${config.params.bucket}.${ep.hostname}`,
              objectPath
            );
          }
        } catch (err) {
          console.error("error uploading object to s3", objectPath);
          console.error(err);
          throw err;
        }
      },
      /**
       * Deletes a file from the configured bucket
       * @param {File} file File object to upload, with metadata
       * @param {*} customParams additional configuration, currently unused by strapi
       */
      async delete(file, customParams = {}) {
        let prefix = `${config.prefix}` || "";

        const objectPath = join(
          prefix,
          file.path || "",
          `${file.hash}${file.ext}`
        );
        try {
          await S3.send(
            new DeleteObjectCommand({
              Bucket: config.params.bucket || config.params.Bucket,
              Key: objectPath,
              ...customParams,
            })
          );
        } catch (err) {
          console.error("error deleting object", objectPath);
          console.error(err);
          throw err;
        }
      },
    };
  },
};
