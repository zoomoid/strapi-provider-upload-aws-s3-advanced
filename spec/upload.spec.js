"use strict";

/* eslint-disable no-unused-vars */
const fs = require("fs");
const _ = require("lodash");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const plugin = require("../lib");
const { assert } = require("console");

describe("upload w/ buffer", async function () {
  /** @type {import("../lib").Configuration} */
  const staticConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_DEFAULT_REGION,
    bucket: process.env.AWS_BUCKET,
    prefix: process.env.BUCKET_PREFIX,
    params: {
      bucket: process.env.AWS_BUCKET,
    },
  };

  /** utility with same config as inside the plugin, to clean up after tests */
  const S3 = new S3Client({
    credentials: {
      accessKeyId: staticConfig.accessKeyId,
      secretAccessKey: staticConfig.secretAccessKey,
    },
    region: staticConfig.region,
  });

  /** Client endpoint to assert URLs with */
  const endpoint = await S3.config.endpoint();

  /**
   * Calls the plugin's initialization with given configuration and returns the upload function
   * that wraps it's closures config values to use in tests
   * @param {import("../lib").Configuration} config
   * @returns upload function from the plugin's init() return
   */
  const useUpload = (config = {}) => {
    return plugin.init({
      ...config,
    }).upload;
  };

  /** upload this project's licence to the S3 bucket */
  const filename = "LICENSE";

  /** helper function for getting prefixed file at object storage  */
  const path = (prefix = "") => `${prefix}/${filename}`;

  /** @type {import("../lib").File} */
  var file = {
    buffer: fs.readFileSync(path.join(__dirname, `../${filename}`)),
    mime: "text/plain",
    ext: "",
    hash: filename,
  };

  it("undefined baseUrl", async function () {
    const upload = useUpload({
      ...staticConfig,
      baseUrl: undefined,
    });

    // upload call that implements the strapi API for calling an upload provider
    await upload(file);

    assert(
      file.url.startsWith(
        `${endpoint.protocol}://${staticConfig.bucket}.${endpoint.hostname}`
      ),
      "file.url does not contain canonic endpoint URL"
    );
    assert(
      file.url.includes(filename),
      "file.url does not contain the file's name"
    );
  });
  it("defined baseUrl", function () {
    const upload = useUpload({
      ...staticConfig,
      baseUrl: staticConfig.baseUrl, // defined baseUrl
    });

    // upload call that implements the strapi API for calling an upload provider
    await upload(file);

    assert(
      file.url.startsWith(baseUrl),
      "file.url does not contain configured base urls"
    );
    assert(
      file.url.includes(filename),
      "file.url does not contain the file's name"
    );
  });

  it("empty baseUrl", function () {
    const upload = useUpload({
      ...staticConfig,
      baseUrl: "", // empty baseUrl
    });
    // upload call that implements the strapi API for calling an upload provider
    await upload(file);
    assert(
      file.url.startsWith(
        `${endpoint.protocol}://${staticConfig.bucket}.${endpoint.hostname}`
      ),
      "file.url does not contain canonic endpoint URL"
    );
    assert(
      file.url.includes(filename),
      "file.url does not contain the file's name"
    );
  });

  /**
   * Deletes the creates S3 object after EACH run of a test
   */
  afterEach(async function () {
    const resp = await S3.send(
      new DeleteObjectCommand({
        Bucket: staticConfig.bucket,
        Key: path(staticConfig.prefix),
      })
    );
  });
});
