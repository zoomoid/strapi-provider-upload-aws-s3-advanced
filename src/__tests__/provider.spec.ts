import {
  DeleteObjectCommand,
  PutObjectCommand, S3Client
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Readable } from "stream";
import { init, type File } from "..";

const client = new S3Client({
  region: "eu-central-1"
})
const s3ClientMock = mockClient(client);

describe("aws-s3-advanced provider", () => {
  const providerInstance = init({
    params: {
      Bucket: "test-bucket",
    },
    region: "eu-central-1",
    client: client,
  });

  beforeEach(() => {
    s3ClientMock.reset();
  });

  it("should upload a buffer to s3", async () => {
    s3ClientMock.on(PutObjectCommand).resolves({});

    // this buffer is below @aws-sdk/lib-storage.MIN_PART_SIZE = 1024 * 1024 * 5 (5Mb)
    // so it results in a single PutObjectCommand
    const buffer = Buffer.from("Test Text from Buffer", "utf-8");

    const file: File = {
      stream: buffer,
      ext: ".txt",
      mime: "text/plain",
      hash: "12345",
      path: "",
    };

    await providerInstance.upload(file);

    expect(file.url).toBeDefined();
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });

  it("should upload a readable stream to s3", async () => {
    s3ClientMock.on(PutObjectCommand).resolves({});

    // this stream is below @aws-sdk/lib-storage.MIN_PART_SIZE = 1024 * 1024 * 5 (5Mb)
    // so it results in a single PutObjectCommand
    const stream = Readable.from("Test Text for Stream usage", {
      encoding: "utf-8",
    });

    const file: File = {
      stream: stream,
      ext: ".txt",
      mime: "text/plain",
      hash: "demo-text-from-stream_12345",
      path: "",
    };

    await providerInstance.upload(file);

    expect(file.url).toBeDefined();
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
    console.log(file.url)
  });

  it("should delete an object from s3", async () => {
    s3ClientMock.on(DeleteObjectCommand).resolves({});

    const file: File = {
      ext: "txt",
      mime: "text/plain",
      hash: "12345",
      path: "demo-text-from-stream",
    };

    await providerInstance.delete(file);

    expect(s3ClientMock).toHaveReceivedCommand(DeleteObjectCommand);
  });
});
