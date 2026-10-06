# Project creation and media storage

PR 4 turns the authenticated account shell into a usable project boundary.

## Project creation

Creating a project requires:

- title
- optional description
- output aspect ratio
- frame rate
- one finished music file

The product does not edit that music. It becomes the project's immutable `AUDIO_MASTER`.

The initial `ProjectVersion` pins the exact `AssetVersion` representing that uploaded master.

## Audio validation

The server does not trust a browser MIME type or filename alone. It recognizes supported audio containers from their file signatures:

- MP3
- WAV / RF64
- FLAC
- OGG / Opus
- AIFF / AIFC
- M4A / MP4-family audio
- AAC ADTS

The maximum upload size is configurable with `MAX_AUDIO_UPLOAD_BYTES`.

## Atomicity and cleanup

Project creation follows this sequence:

1. validate project settings and audio bytes
2. calculate SHA-256
3. generate immutable IDs and storage key
4. write the audio object
5. atomically create project, version, asset, asset version, version nodes, and dependency edge
6. if the database transaction fails, delete the uploaded object

This avoids a database project that points to missing media. A failed cleanup raises an aggregate error rather than silently hiding an orphan.

## Storage drivers

Application code uses the `AssetStorage` contract.

### Local

The local driver writes beneath `ASSET_STORAGE_LOCAL_ROOT`.

Objects are opened with exclusive-create semantics so an immutable asset key cannot be overwritten. Path traversal outside the configured root is rejected.

Read URLs are HMAC-signed and time limited. The local read endpoint supports byte ranges so browser audio seeking works.

### S3-compatible

The S3 driver works with AWS S3 and compatible object stores. It supports:

- PutObject
- DeleteObject
- HeadObject
- presigned GetObject URLs
- optional custom endpoint
- optional path-style addressing
- explicit credentials or the AWS SDK's normal credential provider chain

## Current upload transport

PR 4 accepts multipart audio through the application server and then writes it through the configured storage adapter. This is a real working upload path.

A later scalability optimization can issue direct multipart/presigned uploads for very large media. That optimization will reuse the same immutable asset/version semantics and storage interface; it does not require redesigning project data.
