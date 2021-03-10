# strapi-provider-upload-aws-s3-advanced

## Configurations

This extends the original configurability of the provider by adding both a `baseUrl`, which may be your CDN URL, which replaces the endpoint returned from AWS with a custom URL, and `prefix`, which does exactly that: prefixes the object's path such that we do not strictly upload into the buckets root directory. This can be used to keep the bucket organized.

Everything else follows the regular strapi-provider-upload-aws-s3 schema.

Your configuration is passed down to the provider. (e.g: `new AWS.S3(config)`). You can see the complete list of options [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)

See the [using a provider](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#using-a-provider) documentation for information on installing and using a provider. And see the [environment variables](https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#environment-variables) for setting and using environment variables in your configs.

**Example**

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    provider: 'aws-s3-advanced',
    providerOptions: {
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_ACCESS_SECRET'),
      region: env('AWS_REGION'),
      params: {
        Bucket: env('AWS_BUCKET'),
      },
      baseUrl: env('CDN_BASE_URL'), // e.g. https://cdn.example.com, this is stored in strapi's database to point to the file
      prefix: env('BUCKET_PREFIX') // e.g. strapi-assets, note the missing slash at the start
    },
  },
  // ...
});
```

## Resources

- [License](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi community on Slack](https://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
