"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
/**
 * Removes leading and trailing slashes from a path prefix and returns either no prefix ("")
 * or a prefix without a leading but with a trailing slash
 * @param prefix bucket prefix to use for putting objects into S3's folder abstraction
 * @returns normalized prefix string
 */
function normalizePrefix(prefix) {
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
function join(...segments) {
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
function init({ region, accessKeyId, secretAccessKey, baseUrl, client, ...config }) {
    if (!accessKeyId) {
        throw Error("No AWS_ACCESS_KEY_ID. Set this key in deploy.env");
    }
    if (!secretAccessKey) {
        throw Error("No AWS_SECRET_ACCESS_KEY. Set this key in deploy.env");
    }
    const s3Client = client
        ? client
        : new client_s3_1.S3Client({
            ...config,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
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
    const upload = async (file, customParams = {}) => {
        const path = file.path ?? "";
        const filename = `${file.hash}${file.ext}`;
        const objectPath = join(prefix, path, filename);
        const uploadParams = {
            Bucket: bucket,
            Key: objectPath,
            Body: file.stream || Buffer.from(file.buffer, "binary"),
            ContentType: file.mime,
            ...customParams,
            ...acl,
        };
        try {
            const uploadPromise = new lib_storage_1.Upload({
                client: s3Client,
                params: uploadParams,
            });
            await uploadPromise.done().then(() => {
                console.log("Successfully uploaded to S3 Bucket.");
            });
            if (baseUrl === undefined) {
                // assemble virtual-host-based S3 endpoint
                const hostname = [bucket, "s3", region, "amazonaws", "com"].join(".");
                file.url = `https://${hostname}/${objectPath}`;
            }
            else {
                file.url = join(baseUrl ?? "", objectPath);
            }
        }
        catch (err) {
            console.error("Error uploading object to bucket %s", objectPath, err);
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
        /**
         * Deletes an object from the configured bucket
         * @param file File object from strapi controller
         * @param customParams action parameters, overridable from config, see https://github.com/strapi/strapi/tree/main/packages/providers/upload-aws-s3
         */
        async delete(file, customParams = {}) {
            const path = file.path ?? "";
            const filename = `${file.hash}${file.ext}`;
            const objectPath = join(prefix, path, filename);
            try {
                await s3Client.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: bucket,
                    Key: objectPath,
                    ...customParams,
                }));
            }
            catch (err) {
                console.error("Error deleting object to bucket %s", objectPath, err);
                throw err;
            }
        },
    };
}
exports.init = init;
