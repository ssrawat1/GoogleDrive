import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';
import { File } from '../models/fileModel.js';
import { Directory } from '../models/directoryModel.js';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { resolve } from 'path';
import updateDirectorySize from '../utils/updateDirectorySize.js';
import { User } from '../models/userModel.js';

export const uploadFile = async (req, res, next) => {
  const parentDirId = req.params.parentDirId || req.user.rootDirId;
  const filename = req.headers.filename || 'untitled';
  const filesize = Number(req.headers.filesize);

  // Handling file size
  let totalFileSize = 0;
  const maxAllowedFileSize = 250 * 1024 * 1024; // Max 250MB

  // find dir and also ensure that dir belongs to the user
  try {
    const parentDirData = await Directory.findOne({
      _id: parentDirId,
      userId: req.user._id,
    }).lean();
    // Check if parent dir exists
    if (!parentDirData) {
      return res.status(404).json({ error: 'Parent directory not found!' });
    }

    //Prevent the upload size of the file from exceeding the storage limit.

    const user = await User.findById(req.user._id).lean().select('storageLimit storageUsed');

    const occupiedSize = parentDirData.size;
    const remainingStorage = user.storageLimit - occupiedSize;
    console.log({ occupiedSize });
    console.log({ remainingStorage });

    if (filesize > remainingStorage) {
      console.log({ uploadSize: filesize });
      return req.destroy();
    }

    const extension = path.extname(filename);
    const { _id } = await File.insertOne({
      extension,
      name: filename,
      size: filesize,
      parentDirId: parentDirData._id,
      userId: req.user._id, // add so that we can easily check the user file
    });
    const fullFileName = `${_id.toString()}${extension}`;

    const filePath = resolve(import.meta.dirname, '../storage', fullFileName);

    const writeStream = createWriteStream(filePath);

    let uploadAborted = false;

    req.on('data', async (chunk) => {
      if (uploadAborted) return;

      totalFileSize += chunk.length;

      if (totalFileSize > maxAllowedFileSize) {
        uploadAborted = true;
        writeStream.end();
        return req.destroy(); // forcefully ends the connection
      }

      //Prevent the upload size of the file from exceeding the storage limit.

      if (totalFileSize > remainingStorage) {
        console.log({ uploadSize: totalFileSize });
        uploadAborted = true;
        writeStream.end();
        return req.destroy(); // forcefully ends the connection
      }

      const isWritable = writeStream.write(chunk);

      if (!isWritable) req.pause();
    });

    req.on('close', async () => {
      console.log('running close..', { uploadAborted });
      if (uploadAborted) {
        await File.deleteOne({ _id });
        await rm(filePath);
      }
    });

    writeStream.on('drain', () => {
      req.resume();
    });

    req.on('end', async () => {
      console.log('end running...');
      /* updating size until we don't reach at parent Directory */
      await updateDirectorySize(parentDirId, totalFileSize);
      return res.status(201).json({ message: 'File Uploaded'});
    });

    req.on('error', async () => {
      console.log('file is not uploaded yet!');
      //delete file from file collection
      await File.deleteOne({ _id });
      // Remove file from storage
      await rm(`${filePath}`);
      return res.status(404).json({ message: 'Could not Upload File ' });
    });
  } catch (error) {
    console.log('error:', error);
    next(error);
  }
};

export const getFile = async (req, res, next) => {
  const { id } = req.params;

  try {
    const fileData = await File.findOne({
      _id: id,
      userId: req.user._id,
    });

    // Check if file exists and if exist then check it's ownership
    if (!fileData) {
      return res.status(404).json({ error: 'File not found!' });
    }
    const filePath = resolve(import.meta.dirname, '../storage', `${id}${fileData.extension}`);

    // Allow Client To Download the Files
    if (req.query.action === 'download') {
      return res.download(filePath, fileData.name);
    }

    // sending Single File To The Client
    return res.sendFile(filePath, (err) => {
      if (!res.headersSent && err) {
        return res.status(404).json({ error: 'File not found!' });
      }
    });
  } catch (error) {
    next(error);
  }
};

export const renameFile = async (req, res, next) => {
  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  const { id } = req.params;
  const newFileName = purify.sanitize(req.body.newFilename, {
    ALLOWED_TAGS: [], // No HTML tags
    ALLOWED_ATTR: [], // No attributes
  });

  try {
    // find file and check it's ownership
    const file = await File.findOne({ _id: id, userId: req.user._id });
    if (!file) {
      return res.status(404).json({ error: 'File not found!' });
    }
    // Rename file here
    file.name = newFileName;

    await file.save();
    return res.status(200).json({ message: 'Renamed' });
  } catch (err) {
    err.status = 500;
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  const { id } = req.params;

  // Check if file exists and belong to the same user
  const file = await File.findOne({ _id: id, userId: req.user._id }).select(
    'extension size parentDirId'
  );

  if (!file) {
    return res.status(404).json({ error: 'File not found!' });
  }

  try {
    const filePath = resolve(import.meta.dirname, '../storage', `${id}${file.extension}`);

    // Remove file from storage
    await rm(filePath);
    // Remove file from DB
    await file.deleteOne(); //file delete itself

    /* Decreasing file size unless we don't reach at parent Directory */
    await updateDirectorySize(file.parentDirId, -file.size);

    return res.status(200).json({ message: 'File Deleted Successfully' });
  } catch (err) {
    next(err);
  }
};
