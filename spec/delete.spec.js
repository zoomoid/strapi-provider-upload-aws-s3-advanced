'use strict';
/* eslint-disable no-unused-vars */
const fs = require('fs');
const _ = require('lodash');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const S3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_DEFAULT_REGION,
});

const bucket = process.env.BUCKET;
const prefix = "cms-test/";
const objectPath = `${prefix}LICENSE`;

const uploadParams = {
  Bucket: bucket,
  Key: objectPath,
}

const resp = S3.send(new DeleteObjectCommand(uploadParams));

resp.then((data) => {
  console.log(data);
  S3.config.endpoint().then((ep) => console.log(ep));
});
resp.catch((err) => {
  console.error(err);
});
