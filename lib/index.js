'use strict';
/* eslint-disable no-unused-vars */

const _ = require('lodash');
const AWS = require('aws-sdk');

module.exports = {
  init(config) {
    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    });

    return {
      upload(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // upload file on S3 bucket
          let prefix = config.prefix || "";
          prefix = prefix.trim() === "/" ? "" : prefix.trim(); // prefix only if not root
          const path = file.path ? `${file.path}/` : '';
          const objectPath = `${prefix}${path}${file.hash}${file.ext}`;
          S3.upload(
            {
              Key: objectPath,
              Body: Buffer.from(file.buffer, 'binary'),
              ACL: 'public-read',
              ContentType: file.mime,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                console.error(prefix, path, objectPath, data);
                return reject(err);
              }
              // set the bucket file url
              if(config.baseUrl){
                file.url = `${config.baseUrl}/${objectPath}`;
              } else {
                // if no baseUrl provided, use the endpoint returned from S3
                file.url = data.Location;
              }
              resolve();
            }
          );
        });
      },
      delete(file, customParams = {}) {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          let prefix = config.prefix || "";
          prefix = prefix.trim() === "/" ? "" : prefix.trim(); // prefix only if not root
          const path = file.path ? `${file.path}/` : '';
          S3.deleteObject(
            {
              Key: `${prefix}${path}${file.hash}${file.ext}`,
              ...customParams,
            },
            (err, data) => {
              if (err) {
                console.error(prefix, path, objectPath, data);
                return reject(err);
              }
              resolve();
            }
          );
        });
      },
    };
  },
};
