"use strict";

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

module.exports = {
  init(config) {
    const S3 = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
      ...config,
    });
    const upload = async (file, customParams = {}) => {
      let prefix = config.prefix || "";
      prefix = prefix.trim() === "/" ? "" : prefix.trim(); // prefix only if not root
      const path = file.path ? `${file.path}/` : "";
      const objectPath = `${prefix}${path}${file.hash}${file.ext}`;
      const uploadParams = {
        Bucket: config.params.bucket,
        Key: objectPath,
        Body: file.stream || Buffer.from(file.buffer, "binary"),
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
          file.url = `${config.baseUrl}/${objectPath}`;
        } else {
          // if no baseUrl provided, use the endpoint returned from S3
          const ep = await S3.config.endpoint();
          file.url = `https://${config.params.bucket}.${ep.hostname}/${objectPath}`;
        }
      } catch (err) {
        console.error("error uploading object to s3", objectPath);
        console.error(err);
        throw err;
      }
    }
    return {
      uploadStream(file, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file, customParams = {}) {
        return upload(file, customParams);
      },
      // delete file in S3 bucket
      async delete(file, customParams = {}) {
        let prefix = config.prefix || "";
        prefix = prefix.trim() === "/" ? "" : prefix.trim(); // prefix only if not root
        const path = file.path ? `${file.path}/` : "";
        try {
          await S3.send(
            new DeleteObjectCommand({
              Bucket: config.params.bucket,
              Key: `${prefix}${path}${file.hash}${file.ext}`,
              ...customParams,
            })
          );
        } catch (err) {
          console.error("error deleting object", path);
          console.error(err);
          throw err;
        }
      },
    };
  },
};
