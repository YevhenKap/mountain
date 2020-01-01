// @flow

import path from 'path'
import fs from 'fs'
import mime from 'mime'

import { isDir } from './helpers.mjs'

import type { OutgoingHttpHeaders, ServerHttp2Stream } from 'http2'

export type SendOptions = {
  type: 'data' | 'file' | 'headers',
  data?: string | number[] | { [key: string]: any },
  headers?: OutgoingHttpHeaders,
}

export type Http2Error = {
  status: number,
  reason?: string,
  error?: Error,
}

/**
 * Sends data to client over stream.
 * @param {import('http2').ServerHttp2Stream} stream - stream that transfer response to client.
 * @param {Object} options - object that contains data that need to be sent to client.
 * @param {'data'|'file'|'headers'} options.type - type of data that need to be sent. If value is `data` or `file` *options.data* need to be provided. Otherwise *options.header* must be present.
 * @param {String|Number[]|{ [key: String]: object }} [options.data] - data that need to be sent over network. For *file* type it needs to be the file or directory name (type `String`). For *headers* type it need to be `null` or `undefined`. For *data* type it expects to be array of octets or object, or string.
 * @param {import('http2').OutgoingHttpHeaders} [options.headers] - headers  that will be set to response.
 */
export default function send(stream: ServerHttp2Stream, options: SendOptions) {
  switch (options.type) {
    case 'data':
      if (
        options.data &&
        Array.isArray(options.data) &&
        typeof options.data[0] !== 'number'
      ) {
        sendError(stream, {
          status: 406,
          reason: `Type of data must be array of octets, object or string, but received Array of ${typeof options
            .data[0]}`,
        })
      } else {
        const body =
          typeof options.data !== 'string'
            ? JSON.stringify(options.data)
            : options.data
        const buffer = Buffer.from(body || '')
        sendData(stream, buffer, options.headers)
      }

      break
    case 'file':
      if (options.data) {
        if (typeof options.data === 'string') {
          sendFile(stream, options.data, options.headers)
        } else {
          sendError(stream, {
            status: 406,
            reason: `To send file you must provide path to this file. Expect path (type - String), but received ${typeof options.data}`,
          })
        }
      } else {
        sendError(stream, {
          status: 404,
          reason: `No data is provided about file or directory: ${options.data ||
            ''}`,
        })
      }
      break
    default:
      stream.respond(options.headers, { endStream: true })
  }
}

/**
 * Sends error to client and close stream.
 */
export function sendError(stream: ServerHttp2Stream, error: Http2Error) {
  stream.respond({
    ':status': `${error.status}`,
  })
  const payload =
    error.reason || error.error
      ? { reason: error.reason, error: error.error }
      : undefined // TODO: make precise assertion.
  stream.end(payload)
}

/**
 * Sends file over network and close stream.
 * @param {import('http2').ServerHttp2Stream} stream
 * @param {String} fileOrDir - name of the file that need to be sent or directory in which all files need to be sent.
 * @param {import('http2').OutgoingHttpHeaders} [headers]
 * @throws {TypeError} if *fileOrDir* is not a string.
 */
function sendFile(
  stream: ServerHttp2Stream,
  fileOrDir: string,
  headers?: OutgoingHttpHeaders = {}
) {
  if (typeof fileOrDir !== 'string') {
    throw new TypeError(
      `Type of [fileOrDir] parameter must be String, but given ${typeof fileOrDir}`
    )
  }

  if (isDir(fileOrDir)) {
    const files = fs.readdirSync(fileOrDir) // resolves path himself

    files.forEach(file => {
      const pathToFile = path.normalize(`${fileOrDir}/${file}`)
      const stat = fs.statSync(pathToFile)
      const defaultHeaders = {
        'content-length': stat.size,
        'last-modified': stat.mtime.toUTCString(),
        'content-type': mime.getType(pathToFile),
        // $FlowFixMe
        ...headers,
      }
      if (file !== 'index.html') {
        push(stream, {
          type: 'file',
          data: pathToFile,
          headers: defaultHeaders,
        })
      }
    })

    stream.close()
  } else {
    const stat = fs.statSync(fileOrDir)
    const defaultHeaders = {
      'content-length': stat.size,
      'last-modified': stat.mtime.toUTCString(),
      'content-type': mime.getType(fileOrDir),
      // $FlowFixMe
      ...headers,
    }

    const isFileExists = fs.existsSync(fileOrDir)

    if (isFileExists) {
      stream.respondWithFile(fileOrDir, defaultHeaders, {
        onError(error) {
          sendError(stream, {
            status: 500,
            reason: 'An error occurred while sending file to client.',
            error,
          })
        },
      })
    } else {
      sendError(stream, {
        status: 404,
        reason: `File: ${fileOrDir} not found.`,
      })
    }
  }
}

/**
 * Send raw data to client.
 */
function sendData(
  stream: ServerHttp2Stream,
  buffer: Buffer,
  headers?: OutgoingHttpHeaders = {}
) {
  const responseHeaders = {
    'content-length': buffer.length,
    'content-type': 'application/json',
    // $FlowFixMe
    ...headers,
  }
  stream.additionalHeaders(responseHeaders)
  stream.end(JSON.stringify(buffer))
}

/**
 * Push data to client.
 * @param {import('http2').ServerHttp2Stream} stream
 * @param {Object} options
 * @param {'data'|'file'|'headers'} options.type - type of data that need to be sent.
 * @param {String} [options.data] - data that need to be sent over network. For *file* type it needs to be the file or directory name. For *headers* type it need to be `null` or `undefined`. For *data* type ?.
 * @param {import('http2').OutgoingHttpHeaders} [options.headers] - if not provided default value is `{ ':path': '/' }`
 */
function push(
  stream: ServerHttp2Stream,
  { type, data, headers = { ':path': '/' } }: SendOptions
) {
  stream.pushStream(headers, (error, pushStream, outHeaders) => {
    if (error) {
      sendError(stream, {
        status: 400,
        error,
      })
    } else if (typeof data === 'string' && isDir(data)) {
      sendError(stream, {
        status: 403,
        reason:
          'Creating pushStream inside pushStream is forbidden. You are trying to send multiple files inside pushStream.',
      })
    }
    send(pushStream, {
      type,
      data,
      headers: outHeaders,
    })
  })
}
