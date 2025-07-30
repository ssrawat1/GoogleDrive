import { createReadStream, createWriteStream } from 'fs';
import { rm, rename } from 'fs/promises';
import http from 'http';
import { readdir, stat } from 'fs/promises';
import mime from 'mime-types';
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');

  const itemsList = await readdir('./storage');
  // console.log(itemsList);

  if (req.method === 'GET') {
    if (req.url === '/') {
      res.end(JSON.stringify(itemsList));
    } else {
      const [url, queryString] = req.url.split('?');
      const params = new URLSearchParams(queryString);
      const { action } = Object.fromEntries(params);
      const filePath = `./storage${url}`;
      try {
        const fileStat = await stat(filePath);

        if (fileStat.isDirectory()) {
          // console.log('URL:', url);
          // console.log('file path:', filePath);
          const dirContents = await readdir(filePath);
          contents;
          return res.end(JSON.stringify(dirContents));
        }

        console.log('file path:', filePath);
        const contentType = mime.lookup(filePath) || 'application/octet-stream';
        const readStream = createReadStream(filePath);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileStat.size);

        if (action === 'download') {
          res.setHeader('Content-Disposition', `attachment; filename="${url.slice(1)}"`);
        }

        readStream.pipe(res);

        readStream.on('error', (err) => {
          res.statusCode = 404;
          res.end('Not Found');
        });
      } catch (error) {
        res.statusCode = 404;
        res.end(JSON.stringify('Not Found'));
      }
    }
  } else if (req.method === 'OPTIONS') {
    res.end('OK');
  } else if (req.method === 'POST') {
    const filename = req.headers.filename;
    console.log('filename:', filename);
    const writeStream = createWriteStream(`storage/${filename}`);

    req.on('data', (chunk) => {
      writeStream.write(chunk);
    });

    req.on('end', () => {
      writeStream.end();
      console.log('Upload finished');
      res.end('file uploaded on server');
    });
  } else if (req.method === 'DELETE' && req.url === '/delete') {
    try {
      req.on('data', async (chunk) => {
        const filename = chunk.toString();
        await rm(`./storage/${filename}`, { recursive: true, force: true });
        res.end(JSON.stringify('file delte successfully'));
      });
    } catch (error) {
      res.end(JSON.stringify("File doesn't exist"));
    }
  } else if (req.method === 'PATCH' && req.url === '/rename') {
    try {
      req.on('data', async (chunk) => {
        const fileData = JSON.parse(chunk);
        console.log(fileData);
        const { currName, renameFile } = fileData;
        await rename(`./storage/${currName}`, `./storage/${renameFile}`);
        res.end(JSON.stringify('file rename Sucessfully'));
      });
    } catch (error) {
      res.end(JSON.stringify('file name failed'));
    }
  }
});

const PORT = 80;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
