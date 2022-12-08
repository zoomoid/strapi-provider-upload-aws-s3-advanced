import {
  DeleteObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

interface Config {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  prefix?: string;
  baseUrl?: string;
  params: Partial<{
    Bucket: string;
    bucket: string;
    ACL: string;
    acl: string;
  }> &
    Record<string, unknown>;
  client?: any, // allows to pass in an instantiated S3 client into init. Useful for unit testing
}

export interface File {
  stream?: ReadableStream;
  buffer?: any;
  mime?: string;
  ext?: string;
  /** hash contains the entire filename, expect for the extension */
  hash?: string;
  /** path seems to almost be empty */
  path?: string;
  /** the S3 object URL */
  url?: string;
}

/**
 * Removes leading and trailing slashes from a path prefix and returns either no prefix ("")
 * or a prefix without a leading but with a trailing slash
 * @param prefix bucket prefix to use for putting objects into S3's folder abstraction
 * @returns normalized prefix string
 */
function normalizePrefix(prefix: string): string {
  prefix = prefix.trim().replace(/^\/*/, "").replace(/\/*$/, "");
  if (!prefix) {
    return "";
  }
  return prefix + "/";
}

/**
 * Safely joins a list of path segments, similar to how Node's path library's "join" does
 * @param segments path segments
 * @returns single path string joined by forward slashes
 */
function join(...segments: string[]): string {
  let s = "";
  for (let i = 0; i < segments.length - 1; i++) {
    const l = segments[i];
    s += l.endsWith("/") || l == "" ? l : l + "/";
  }
  s += segments[segments.length - 1];
  return s;
}

/**
 * Initialize the plugin by bootstrapping an S3 client from the config
 * @param config Strapi provider plugin configuration. Apart from the required
 * @returns Provider object containing handlers for upload, uploadStream, and delete actions
 */
export function init({
  region,
  accessKeyId,
  secretAccessKey,
  baseUrl,
  client,
  ...config
}: Config & Record<string, unknown>) {
  let S3: S3Client
  if(!client) {
    // instantiate fresh S3 client, this should be the default at runtime
    const credentials = (() => {
      if (accessKeyId && secretAccessKey) {
        return {
          credentials: {
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey,
          },
        };
      }
      return {};
    })();

    S3 = new S3Client({
      ...credentials,
      ...config,
      region,
    });
  } else {
    S3 = client
  }

  const prefix = config.prefix ? normalizePrefix(config.prefix) : "";
  const bucket = config.params.Bucket || config.params.bucket;
  const acl = (() => {
    if (config.params.ACL) {
      return { ACL: config.params.ACL };
    }
    if (config.params.acl) {
      return { ACL: config.params.acl };
    }
    return {};
  })();

  /**
   * Uploads a buffered or streamed file to S3 using the previously configured client
   * @param file File object from strapi controller
   * @param customParams action parameters, overridable from config, see https://github.com/strapi/strapi/tree/main/packages/providers/upload-aws-s3
   */
  const upload = async (
    file: File,
    customParams: Record<string, unknown> = {}
  ) => {
    const path = file.path ?? "";
    const filename = `${file.hash}${file.ext}`;
    const objectPath = join(prefix, path, filename);

    const uploadParams: PutObjectCommandInput = {
      Bucket: bucket,
      Key: objectPath,
      Body: file.stream || Buffer.from(file.buffer, "binary"),
      ContentType: file.mime,
      ...acl,
      ...customParams,
    };
    try {
      const uploadPromise = new Upload({
        client: S3,
        params: uploadParams,
      });
      await uploadPromise.done();
      if (baseUrl === undefined) {
        // assemble virtual-host-based S3 endpoint
        const hostname = [bucket, "s3", region, "amazonaws", "com"].join(".");
        file.url = `https://${hostname}/${objectPath}`;
      } else {
        file.url = join(baseUrl ?? "", objectPath);
      }
    } catch (err) {
      console.error("Error uploading object to bucket %s", objectPath, err);
      throw err;
    }
  };

  return {
    uploadStream(file: File, customParams: Record<string, unknown> = {}) {
      return upload(file, customParams);
    },
    upload(file: File, customParams: Record<string, unknown> = {}) {
      return upload(file, customParams);
    },
    /**
     * Deletes an object from the configured bucket
     * @param file File object from strapi controller
     * @param customParams action parameters, overridable from config, see https://github.com/strapi/strapi/tree/main/packages/providers/upload-aws-s3
     */
    async delete(file: File, customParams: Record<string, unknown> = {}) {
      const path = file.path ?? "";
      const filename = `${file.hash}${file.ext}`;
      const objectPath = join(prefix, path, filename);
      try {
        await S3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: objectPath,
            ...customParams,
          })
        );
      } catch (err) {
        console.error("Error deleting object to bucket %s", objectPath, err);
        throw err;
      }
    },
  };
}
