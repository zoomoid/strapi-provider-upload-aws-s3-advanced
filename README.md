# strapi-provider-upload-aws-s3-advanced

## Configurations

This extends the original configurability of the provider by adding both a `baseUrl`, which may be your CDN URL, which replaces the endpoint returned from AWS with a custom URL, and `prefix`, which does exactly that: prefixes the object's path such that we do not strictly upload into the buckets root directory. This can be used to keep the bucket organized.

Everything else follows the regular strapi-provider-upload-aws-s3 schema.

Your configuration is passed down to the provider. (e.g: `new AWS.S3(config)`). You can see the complete list of options [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)

See the [using a provider](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#using-a-provider) documentation for information on installing and using a provider. And see the [environment variables](https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#environment-variables) for setting and using environment variables in your configs.

To upload with ACLs, **make sure that the S3 user has abilities "s3:PutObjectACL" in addition to the regular "s3:PutObject" ability**. Otherwise S3 will reject the upload with "Access Denied".

### Example

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    provider: "aws-s3-advanced",
    providerOptions: {
      accessKeyId: env("AWS_ACCESS_KEY_ID"),
      secretAccessKey: env("AWS_ACCESS_SECRET"),
      region: env("AWS_REGION"),
      params: {
        bucket: env("AWS_BUCKET"), // or "Bucket", @aws-sdk requires capitalized properties, but the convention for this file is lowercased, but the plugin understands both
        acl: env("AWS_BUCKET_ACL"), // or "ACL", see above
      },
      baseUrl: env("CDN_BASE_URL"), // e.g. "https://cdn.example.com", this is stored in strapi's database to point to the file
      prefix: env("BUCKET_PREFIX"), // e.g. "strapi-assets". If BUCKET_PREFIX contains leading or trailing slashes, they are removed internally to construct the URL safely
    },
  },
  // ...
});
```

If using strapi >= 4.0.0, please use the below config:

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: "strapi-provider-upload-aws-s3-advanced",
      providerOptions: {
        accessKeyId: env("AWS_ACCESS_KEY_ID"),
        secretAccessKey: env("AWS_ACCESS_SECRET"),
        region: env("AWS_REGION"),
        params: {
          bucket: env("AWS_BUCKET"), // or "Bucket", @aws-sdk requires capitalized properties, but the convention for this file is lowercased, but the plugin understands both
          acl: env("AWS_BUCKET_ACL"), // or "ACL", see above
        },
        baseUrl: env("CDN_BASE_URL"), // e.g. "https://cdn.example.com", this is stored in strapi's database to point to the file
        prefix: env("BUCKET_PREFIX"), // e.g. "strapi-assets". If BUCKET_PREFIX contains leading or trailing slashes, they are removed internally to construct the URL safely
      },
    },
  },
  // ...
});
```

If you need to extend the configuration of the S3 client with additional properties, put them into `providerOptions.params`. The `params` object is spread into the S3 configuration at initialization, so it will accept any
additional configuration this way.

> Note: If you are migrating from a pre-4.0.0 version (i.e. v3.6.8 or earlier), the `files` relation will include `aws-s3-advanced` as the provider. Previously, the prefix "strapi-upload-provider" was assumed to
> always be present for upload provider plugins. _This is no longer the case in >= 4.0.0_, hence when uploading with the newer version of this provider, strapi will insert new files with the full provider package name, i.e., `strapi-provider-upload-aws-s3-advanced`. See [Migration](#migration) for details on the required manual work.

#### Image Previews

To allow the thumbnails to properly populate, add the below config to

`./config/middlewares.js`

```js
module.exports = ({ env }) => [
  // ...
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": ["'self'", "data:", "blob:", `${env("CDN_BASE_URL")}`],
          "media-src": ["'self'", "data:", "blob:", `${env("CDN_BASE_URL")}`],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```

## Migration

### v4.1.0

To allow for an empty `baseUrl` (#9), we made some adjustments to the way the configuration is parsed: in your `plugins.js`, `env("CDN_BASE_URL")` uses strapi's helper function for parsing ENV variables. If any second argument is omitted,
`undefined` is returned. Thus, if your ENV does not contain any value for `CDN_BASE_URL`, you are good to go. Undefined `baseUrl` causes the plugin to prepend the cannonic default endpoint of your storage provider, e.g., `https://mystoragebucket.s3.amazonaws.com`.

**If instead you defined `CDN_BASE_URL` to be `""`, the `env` helper returns that empty string.** Previously, this was treated as the same case as using `undefined`. In some scenarios however you might not want this, e.g., local development. **Thus, we now check explicitly for undefinedness instead of the prior truthiness.**. If you defined `CDN_BASE_URL` to be an empty string and relied upon the prepending of the cannonical default endpoint, change your ENV variable either explicitly to the endpoint's URL **or** make it undefined.

### v3.x to v4.0.x

Strapi now uses the full package name as provider name, as seen in the configuration of the provider in the Example section above. This means that the relation will include different provider names when using the newer version of this provider with strapi >= 4.0.0 on data from pre-4.0.0. In particular, you will find that the pre-4.0.0 `files` will have the provider `aws-s3-advanved`, while the newer ones will have `strapi-provider-aws-s3-advanved`. **If you're not going to change the existing files in your CDN, you will not need to take any actions**. The provider attribute is only used for mapping the handler for creating or deleting files to the handlers defined in _this_ provider. Files will remain readable with the old provider and new files will be added with the new provider name. **Only if you want to delete old files from the new provider, you will be required to adapt the `files` table**.

In strapi >= 4.0.0, only SQL databases are officially supported, so we will only provide queries for the supported backends:

#### PostgreSQL

```sql
UPDATE files SET provider = 'strapi-provider-upload-aws-s3-advanced' WHERE provider = 'aws-s3-advanced';
```

#### MySQL

```sql
UPDATE `files` SET `provider` = `strapi-provider-upload-aws-s3-advanced` WHERE `provider` = `aws-s3-advanced`;
```

#### SQLite

```sql
UPDATE files SET provider = 'strapi-provider-upload-aws-s3-advanced' WHERE provider = 'aws-s3-advanced';
```

## Resources

- [License](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi community on Slack](https://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
